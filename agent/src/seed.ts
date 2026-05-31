/**
 * Seed demo oaths on testnet so the marketplace shows REAL on-chain data.
 *
 * Mints several oaths in varied verticals/dimensions from one promiser (distinct scope +
 * exec per oath to satisfy registry uniqueness), then stakes a believer and a doubter on
 * each, and leaves them ACTIVE (no settle) so they are browseable. venue=1 (pass-through)
 * so no real exec signature is needed; exec wallets are addresses only (no trades recorded).
 *
 * Run after deploy: bunx tsx src/seed.ts
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { makeClient, deployerKeypair, env } from './sui/client.js';
import { buildMintOathPtb, buildStakeForPtb, buildStakeAgainstPtb, buildMintUsdcPtb } from './sui/ptb.js';
import { log } from './log.js';

const opts = { showEvents: true, showEffects: true } as const;

interface OathSeed {
  label: string;
  maxDrawdownBps: number; minTrades: number; minPnlBps: number; minVolumeUsdc: number;
  allowedAssets: string[]; epochDurationMs: number;
  bond: bigint; clientClaim: bigint;
  believer: bigint; doubter: bigint;
}

// Long epochs so they stay Active/browseable for the demo (7 days, 3 days, 24h).
const DAY = 86_400_000;
const SEEDS: OathSeed[] = [
  { label: 'BTC momentum, tight DD', maxDrawdownBps: 1500, minTrades: 20, minPnlBps: 800, minVolumeUsdc: 50_000, allowedAssets: ['BTC-PERP'], epochDurationMs: 7 * DAY, bond: 25_000n, clientClaim: 12_000n, believer: 4_200n, doubter: 1_800n },
  { label: 'ETH swing, moderate', maxDrawdownBps: 2500, minTrades: 10, minPnlBps: 400, minVolumeUsdc: 0, allowedAssets: ['ETH-PERP', 'BTC-PERP'], epochDurationMs: 3 * DAY, bond: 10_000n, clientClaim: 5_000n, believer: 1_500n, doubter: 2_600n },
  { label: 'Majors basket, conservative', maxDrawdownBps: 1000, minTrades: 30, minPnlBps: 300, minVolumeUsdc: 100_000, allowedAssets: ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'], epochDurationMs: 7 * DAY, bond: 50_000n, clientClaim: 20_000n, believer: 8_000n, doubter: 900n },
  { label: 'SOL scalper, aggressive', maxDrawdownBps: 3500, minTrades: 50, minPnlBps: 1200, minVolumeUsdc: 25_000, allowedAssets: ['SOL-PERP'], epochDurationMs: DAY, bond: 8_000n, clientClaim: 6_000n, believer: 600n, doubter: 3_400n },
];

async function run(client: any, signer: Ed25519Keypair, tx: Transaction, label: string) {
  const res = await client.signAndExecuteTransaction({ transaction: tx, signer, options: opts });
  await client.waitForTransaction({ digest: res.digest });
  if (res.effects?.status.status !== 'success') throw new Error(label + ' failed: ' + JSON.stringify(res.effects?.status));
  return res;
}

async function main() {
  if (env.packageId === '0x0') throw new Error('deploy first; set env');
  const client = makeClient();
  const deployer = deployerKeypair();
  const promiser = Ed25519Keypair.generate();
  const believer = Ed25519Keypair.generate();
  const doubter = Ed25519Keypair.generate();
  const clientAddr = Ed25519Keypair.generate().toSuiAddress();

  const totalBond = SEEDS.reduce((s, x) => s + x.bond, 0n);
  const totalBel = SEEDS.reduce((s, x) => s + x.believer, 0n);
  const totalDoubt = SEEDS.reduce((s, x) => s + x.doubter, 0n);

  // Fund gas for the three signing roles.
  const fund = new Transaction();
  const g = 120_000_000n;
  const [c1, c2, c3] = fund.splitCoins(fund.gas, [g, g, g]);
  fund.transferObjects([c1], promiser.toSuiAddress());
  fund.transferObjects([c2], believer.toSuiAddress());
  fund.transferObjects([c3], doubter.toSuiAddress());
  await run(client, deployer, fund, 'fund');
  log.info('funded roles');

  // Mint USDC to roles (+10% headroom over exact need).
  await run(client, deployer, buildMintUsdcPtb(totalBond, promiser.toSuiAddress()), 'usdc-promiser');
  await run(client, deployer, buildMintUsdcPtb(totalBel, believer.toSuiAddress()), 'usdc-believer');
  await run(client, deployer, buildMintUsdcPtb(totalDoubt, doubter.toSuiAddress()), 'usdc-doubter');
  log.info({ totalBond: totalBond.toString(), totalBel: totalBel.toString(), totalDoubt: totalDoubt.toString() }, 'minted USDC');

  const created: string[] = [];
  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i]!;
    const exec = Ed25519Keypair.generate().toSuiAddress(); // distinct exec per oath (registry uniqueness)
    const mintRes = await run(client, promiser, buildMintOathPtb({
      maxDrawdownBps: s.maxDrawdownBps, minTrades: s.minTrades, minPnlBps: s.minPnlBps, minVolumeUsdc: s.minVolumeUsdc,
      execAddr: exec, venue: 1, allowedAssets: s.allowedAssets, epochDurationMs: s.epochDurationMs,
      bond: s.bond, client: clientAddr, clientClaim: s.clientClaim,
      sealedRoot: 'walrus:' + s.label, bindingNonce: BigInt(1000 + i), startingEquityUsdc: 100_000n,
      execSignature: [], execPubkey: [], validFromMs: 0n, validUntilMs: 9_000_000_000_000n,
    }), 'mint:' + s.label);
    const ev: any = (mintRes.events ?? []).find((e: any) => e.type.endsWith('::oath::OathMinted'));
    const oathId = ev.parsedJson.oath_id;
    created.push(oathId);
    await run(client, believer, buildStakeForPtb(oathId, s.believer), 'believe:' + s.label);
    await run(client, doubter, buildStakeAgainstPtb(oathId, s.doubter), 'doubt:' + s.label);
    log.info({ oathId, label: s.label }, 'seeded oath ' + (i + 1) + '/' + SEEDS.length);
  }

  log.info({ created }, 'SEED COMPLETE — ' + created.length + ' active oaths on ' + env.network);
}

main().catch((e) => { log.error({ err: String(e?.message ?? e) }, 'SEED FAILED'); process.exit(1); });
