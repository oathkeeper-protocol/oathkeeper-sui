/**
 * End-to-end test: full primary + secondary market + settlement on a live Sui network.
 *
 * Mirrors v2_tests::settle_kept_conservation_with_market exactly:
 *   bond 10000, client_claim 5000, believer 2000, doubter 1500  (total in 13500)
 *   KEPT -> promiser +300, believer +1050, doubter -1500, platform +150, client 0  (sum 0)
 *
 * Runs on venue=1 (Hyperliquid/ecdsa pass-through) so the mint needs no real signature.
 * The ed25519/DeepBook path is separately proven by the Move test ed25519_real_signature_verifies.
 *
 * Time: settle_epoch gates on Clock >= epoch_end_ms; the live Clock cannot be advanced,
 * so we use a short epoch (EPOCH_MS) and wait it out, retrying settle on EEpochNotEnded.
 *
 * Run: OATHKEEPER_PACKAGE_ID=.. OATHKEEPER_REGISTRY_ID=.. OATHKEEPER_USDC_TREASURY_ID=.. \
 *      OATHKEEPER_DEPLOYER_KEY=suiprivkey1.. bunx tsx src/e2e.ts
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { makeClient, deployerKeypair, usdcBalance, usdcType, env } from './sui/client.js';
import {
  buildMintOathPtb, buildStakeForPtb, buildStakeAgainstPtb, buildRecordTradesPtb,
  buildSettlePtb, buildBelieverClaimPtb, buildDoubterClaimPtb, buildMintUsdcPtb,
} from './sui/ptb.js';
import { log } from './log.js';

const EPOCH_MS = 60_000;

const opts = { showEvents: true, showEffects: true, showObjectChanges: true, showBalanceChanges: true } as const;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  log.info('  ✓ ' + msg);
}

async function run(client: SuiJsonRpcClient, signer: Ed25519Keypair, tx: Transaction, label: string) {
  const res = await client.signAndExecuteTransaction({ transaction: tx, signer, options: opts });
  await client.waitForTransaction({ digest: res.digest });
  if (res.effects?.status.status !== 'success') {
    throw new Error(`${label} failed: ${JSON.stringify(res.effects?.status)}`);
  }
  log.info(`tx ${label}: ${res.digest}`);
  return res;
}

function eventData(res: any, suffix: string): any {
  const ev = (res.events ?? []).find((e: any) => e.type.endsWith(suffix));
  if (!ev) throw new Error('event not found: ' + suffix);
  return ev.parsedJson;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (env.packageId === '0x0') throw new Error('Set OATHKEEPER_PACKAGE_ID etc. in env (deploy first)');
  const client = makeClient();
  const deployer = deployerKeypair();
  const platform = deployer.toSuiAddress(); // platform_treasury == publisher

  // Fresh role wallets (avoids registry scope/exec-uniqueness collisions across runs).
  const oathkeeper = Ed25519Keypair.generate();
  const believer = Ed25519Keypair.generate();
  const doubter = Ed25519Keypair.generate();
  const exec = Ed25519Keypair.generate();
  const clientAddr = Ed25519Keypair.generate().toSuiAddress(); // SLA counterparty, never signs on Kept

  const addrs = {
    oathkeeper: oathkeeper.toSuiAddress(),
    believer: believer.toSuiAddress(),
    doubter: doubter.toSuiAddress(),
    exec: exec.toSuiAddress(),
  };
  log.info({ platform, ...addrs, client: clientAddr }, 'roles');

  // 1. Fund role wallets with SUI gas from the deployer (one PTB).
  const fund = new Transaction();
  const gasEach = 150_000_000n; // 0.15 SUI
  const [c1, c2, c3, c4] = fund.splitCoins(fund.gas, [gasEach, gasEach, gasEach, gasEach]);
  fund.transferObjects([c1], addrs.oathkeeper);
  fund.transferObjects([c2], addrs.believer);
  fund.transferObjects([c3], addrs.doubter);
  fund.transferObjects([c4], addrs.exec);
  await run(client, deployer, fund, 'fund-gas');

  // 2. Mint mock USDC to the capital roles (deployer holds TreasuryCap).
  await run(client, deployer, buildMintUsdcPtb(10_000n, addrs.oathkeeper), 'mint-usdc-oathkeeper');
  await run(client, deployer, buildMintUsdcPtb(2_000n, addrs.believer), 'mint-usdc-believer');
  await run(client, deployer, buildMintUsdcPtb(1_500n, addrs.doubter), 'mint-usdc-doubter');

  // 3. Pre-snapshot USDC balances.
  const pre = {
    oathkeeper: await usdcBalance(client, addrs.oathkeeper),
    believer: await usdcBalance(client, addrs.believer),
    doubter: await usdcBalance(client, addrs.doubter),
    platform: await usdcBalance(client, platform),
    client: await usdcBalance(client, clientAddr),
  };
  log.info(pre, 'pre-snapshot USDC');

  // 4. PRIMARY: mint the oath (oathkeeper signs). venue=1 -> dummy sig pass-through.
  const mintRes = await run(client, oathkeeper, buildMintOathPtb({
    maxDrawdownBps: 2000, minTrades: 10, minPnlBps: 500, minVolumeUsdc: 0,
    execAddr: addrs.exec, venue: 1, allowedAssets: ['BTC', 'ETH'], epochDurationMs: EPOCH_MS,
    bond: 10_000n, client: clientAddr, clientClaim: 5_000n,
    sealedRoot: 'walrus-blob-root', bindingNonce: 42n, startingEquityUsdc: 100_000n,
    execSignature: [], execPubkey: [], validFromMs: 0n, validUntilMs: 9_000_000_000_000n,
  }), 'mint-oath');
  const minted = eventData(mintRes, '::oath::OathMinted');
  const oathId = minted.oath_id;
  const epochEndMs = Number(minted.epoch_end_ms);
  assert(minted.bond_amount === '10000', 'OathMinted bond_amount == 10000');
  assert(minted.client_claim === '5000', 'OathMinted client_claim == 5000');
  log.info({ oathId, epochEndMs }, 'oath minted');

  // 5. SECONDARY: believer stakes 2000, doubter stakes 1500.
  const bRes = await run(client, believer, buildStakeForPtb(oathId, 2_000n), 'believer-stake');
  const bPos = eventData(bRes, '::believer::BelieverStaked');
  assert(bPos.stake_amount === '2000', 'BelieverStaked stake_amount == 2000');
  const believerPosId = bPos.position_id;

  const dRes = await run(client, doubter, buildStakeAgainstPtb(oathId, 1_500n), 'doubter-stake');
  const dPos = eventData(dRes, '::doubter::DoubterStaked');
  assert(dPos.stake_amount === '1500', 'DoubterStaked stake_amount == 1500');
  const doubterPosId = dPos.position_id;

  // 6. Attestations: 10 trades, end equity 110000 (> pnl floor 105000), satisfies KEPT.
  const tradeRes = await run(client, exec, buildRecordTradesPtb({
    oathId, venueTxHash: '0xdeadbeef', asset: 'BTC',
    pnlDelta: 10_000n, pnlNegative: false, equityAfter: 110_000n, notional: 1_000n,
  }, 10), 'record-10-trades');
  const tradeEvents = (tradeRes.events ?? []).filter((e: any) => e.type.endsWith('::attestation::TradeAttested'));
  assert(tradeEvents.length === 10, '10 TradeAttested events emitted');

  // 7. Wait for epoch end, then settle (retry on EEpochNotEnded = abort 5).
  const waitMs = epochEndMs - Date.now() + 3_000;
  if (waitMs > 0) { log.info(`waiting ${(waitMs / 1000).toFixed(1)}s for epoch end`); await sleep(waitMs); }

  let settleRes: any;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      settleRes = await run(client, deployer, buildSettlePtb(oathId), 'settle');
      break;
    } catch (e: any) {
      if (String(e.message).includes(', 5)') || String(e.message).includes('EEpochNotEnded')) {
        log.warn(`settle attempt ${attempt}: clock lag, retry in 2s`);
        await sleep(2_000);
      } else throw e;
    }
  }
  const settled = eventData(settleRes, '::oath::OathSettled');
  assert(settled.final_status === 1, 'OathSettled final_status == 1 (Kept)');
  assert(settled.bond_to_promiser === '10000', 'bond_to_promiser == 10000');
  assert(settled.bond_to_client === '0', 'bond_to_client == 0 (Kept)');
  assert(settled.loser_to_platform === '150', 'loser_to_platform == 150 (10% of 1500)');
  assert(settled.loser_to_secondary === '300', 'loser_to_secondary == 300 (20% to promiser)');
  assert(settled.loser_to_winners === '1050', 'loser_to_winners == 1050 (70%)');

  // 8. Claims.
  const bClaim = await run(client, believer, buildBelieverClaimPtb(believerPosId, oathId), 'believer-claim');
  assert(eventData(bClaim, '::believer::BelieverPayout').amount === '3050', 'BelieverPayout == 3050 (2000 + 1050)');

  const dClaim = await run(client, doubter, buildDoubterClaimPtb(doubterPosId, oathId), 'doubter-claim');
  assert(eventData(dClaim, '::doubter::DoubterPayout').amount === '0', 'DoubterPayout == 0 (loser on Kept)');

  // 9. Post-snapshot + conservation (deltas must sum to zero).
  const post = {
    oathkeeper: await usdcBalance(client, addrs.oathkeeper),
    believer: await usdcBalance(client, addrs.believer),
    doubter: await usdcBalance(client, addrs.doubter),
    platform: await usdcBalance(client, platform),
    client: await usdcBalance(client, clientAddr),
  };
  const d = {
    oathkeeper: post.oathkeeper - pre.oathkeeper,
    believer: post.believer - pre.believer,
    doubter: post.doubter - pre.doubter,
    platform: post.platform - pre.platform,
    client: post.client - pre.client,
  };
  log.info({ pre, post, delta: d }, 'conservation snapshot');
  assert(d.oathkeeper === 300n, 'oathkeeper delta +300 (bond back + 20% doubter pool)');
  assert(d.believer === 1050n, 'believer delta +1050 (70% doubter pool)');
  assert(d.doubter === -1500n, 'doubter delta -1500 (loser on Kept)');
  assert(d.platform === 150n, 'platform delta +150 (10% doubter pool)');
  assert(d.client === 0n, 'client delta 0 (no payout on Kept)');
  assert(d.oathkeeper + d.believer + d.doubter + d.platform + d.client === 0n, 'CONSERVATION: deltas sum to 0');

  log.info('E2E PASSED — primary + secondary + settlement + conservation all green on ' + env.network);
}

main().catch((e) => { log.error({ err: String(e?.message ?? e) }, 'E2E FAILED'); process.exit(1); });
