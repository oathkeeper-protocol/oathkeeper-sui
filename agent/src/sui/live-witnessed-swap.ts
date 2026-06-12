/**
 * Live witnessed DeepBook swap harness.
 *
 * Modes:
 *   bootstrap-manager  Create/share a BalanceManager, mint caps, log object IDs.
 *   full               Mint witnessed oath, trade via DeepBook, wait, settle witnessed.
 *
 * The script fails before spending gas when required package/object IDs or a new enough Sui CLI
 * are missing. It never reads or prints private keys.
 */
import { execFileSync } from 'node:child_process';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { deployerKeypair, env, keypairFromBech32, makeClient } from './client.js';
import {
  buildBootstrapDeepBookManagerPtb,
  buildMintWitnessedPtb,
  buildSettleWitnessedPtb,
  buildTradeViaDeepBookPtb,
} from './ptb.js';
import { signWitnessedBinding } from './witnessed-binding.js';

type Mode = 'bootstrap-manager' | 'full';

const mode = (process.env.LIVE_WITNESSED_MODE ?? process.argv[2] ?? 'full') as Mode;
const opts = { showEvents: true, showEffects: true, showObjectChanges: true, showBalanceChanges: true } as const;
const DEEPBOOK_MIN_SUI_MINOR = 69;

const EPOCH_MS = BigInt(process.env.LIVE_WITNESSED_EPOCH_MS ?? '60000');
const BOND = BigInt(process.env.LIVE_WITNESSED_BOND ?? '1000');
const CLIENT_CLAIM = BigInt(process.env.LIVE_WITNESSED_CLIENT_CLAIM ?? '500');
const BASE_IN = BigInt(process.env.LIVE_WITNESSED_BASE_IN ?? '1');
const MIN_QUOTE_OUT = BigInt(process.env.LIVE_WITNESSED_MIN_QUOTE_OUT ?? '1');
const INITIAL_QUOTE_DEPOSIT = BigInt(process.env.LIVE_WITNESSED_INITIAL_QUOTE_DEPOSIT ?? '0');
const MAX_DRAWDOWN_BPS = BigInt(process.env.LIVE_WITNESSED_MAX_DRAWDOWN_BPS ?? '2000');
const MIN_TRADES = BigInt(process.env.LIVE_WITNESSED_MIN_TRADES ?? '1');
const MIN_PNL_BPS = BigInt(process.env.LIVE_WITNESSED_MIN_PNL_BPS ?? '0');
const MIN_VOLUME = BigInt(process.env.LIVE_WITNESSED_MIN_VOLUME ?? '0');

const log = {
  info(data: unknown, msg?: string) {
    if (msg) console.log(JSON.stringify({ level: 'info', msg, data }));
    else console.log(JSON.stringify({ level: 'info', msg: String(data) }));
  },
  error(data: unknown, msg: string) {
    console.error(JSON.stringify({ level: 'error', msg, data }));
  },
};

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value === '0x0' || value === 'suiprivkey1...') throw new Error(`Set ${key}`);
  return value;
}

function assertObjectId(name: string, value: string) {
  if (!value || value === '0x0') throw new Error(`Set ${name} to a live object ID`);
}

function checkSuiCli() {
  let version: string;
  try {
    version = execFileSync('sui', ['--version'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Install Sui CLI and ensure `sui --version` works before running live DeepBook swaps');
  }
  const match = version.match(/sui\s+1\.(\d+)\./);
  const minor = match ? Number(match[1]) : 0;
  if (minor < DEEPBOOK_MIN_SUI_MINOR) {
    throw new Error(`Sui CLI ${version} is too old for current DeepBook v3 package resolution; upgrade to >=1.${DEEPBOOK_MIN_SUI_MINOR}.x and rerun`);
  }
  log.info({ version }, 'sui cli ready');
}

function signerFromEnv(key: string): Ed25519Keypair {
  return keypairFromBech32(requiredEnv(key));
}

type TxResponse = Awaited<ReturnType<ReturnType<typeof makeClient>['signAndExecuteTransaction']>>;

async function run(signer: Ed25519Keypair, tx: Transaction, label: string): Promise<TxResponse> {
  const client = makeClient();
  const res = await client.signAndExecuteTransaction({ transaction: tx, signer, options: opts });
  await client.waitForTransaction({ digest: res.digest });
  if (res.effects?.status.status !== 'success') {
    throw new Error(`${label} failed: ${JSON.stringify(res.effects?.status)}`);
  }
  log.info({ digest: res.digest }, `tx ${label}`);
  return res;
}

function objectIdByType(res: TxResponse, typeSuffix: string): string {
  const created = res.objectChanges?.find((c: any) => c.type === 'created' && String(c.objectType).endsWith(typeSuffix)) as any;
  if (!created?.objectId) throw new Error(`Could not find created object ending with ${typeSuffix}`);
  return created.objectId;
}

function eventData(res: TxResponse, suffix: string): any {
  const ev = res.events?.find((e: any) => e.type.endsWith(suffix));
  if (!ev) throw new Error(`event not found: ${suffix}`);
  return ev.parsedJson;
}

async function bootstrapManager(exec: Ed25519Keypair) {
  const res = await run(exec, buildBootstrapDeepBookManagerPtb({
    owner: exec.toSuiAddress(),
    quoteType: env.dbusdcType,
    initialQuoteDeposit: INITIAL_QUOTE_DEPOSIT,
  }), 'deepbook-bootstrap-manager');
  const ids = {
    DEEPBOOK_BALANCE_MANAGER_ID: objectIdByType(res, '::balance_manager::BalanceManager'),
    DEEPBOOK_DEPOSIT_CAP_ID: objectIdByType(res, '::balance_manager::DepositCap'),
    DEEPBOOK_WITHDRAW_CAP_ID: objectIdByType(res, '::balance_manager::WithdrawCap'),
    DEEPBOOK_TRADE_CAP_ID: objectIdByType(res, '::balance_manager::TradeCap'),
  };
  log.info(ids, 'set these env vars for LIVE_WITNESSED_MODE=full');
}

async function fullRun(oathkeeper: Ed25519Keypair, exec: Ed25519Keypair) {
  assertObjectId('OATHKEEPER_PACKAGE_ID', env.packageId);
  assertObjectId('OATHKEEPER_REGISTRY_ID', env.registryId);
  assertObjectId('DEEPBOOK_BALANCE_MANAGER_ID', env.deepbookBalanceManagerId);
  assertObjectId('DEEPBOOK_TRADE_CAP_ID', env.deepbookTradeCapId);
  assertObjectId('DEEPBOOK_DEPOSIT_CAP_ID', env.deepbookDepositCapId);
  assertObjectId('DEEPBOOK_WITHDRAW_CAP_ID', env.deepbookWithdrawCapId);
  assertObjectId('SUI_DBUSDC_POOL_ID', env.suiDbusdcPoolId);

  const now = BigInt(Date.now());
  const bindingNonce = BigInt(process.env.LIVE_WITNESSED_BINDING_NONCE ?? now.toString());
  const validFromMs = BigInt(process.env.LIVE_WITNESSED_VALID_FROM_MS ?? '0');
  const validUntilMs = BigInt(process.env.LIVE_WITNESSED_VALID_UNTIL_MS ?? (now + 3_600_000n).toString());
  const client = process.env.LIVE_WITNESSED_CLIENT_ADDRESS ?? deployerKeypair().toSuiAddress();
  const allowedAssets = (process.env.LIVE_WITNESSED_ALLOWED_ASSETS ?? 'SUI,DBUSDC').split(',').map((s) => s.trim()).filter(Boolean);
  const binding = await signWitnessedBinding(exec, {
    execAddr: exec.toSuiAddress(),
    venue: 0,
    allowedAssets,
    epochDurationMs: EPOCH_MS,
    maxDrawdownBps: MAX_DRAWDOWN_BPS,
    minTrades: MIN_TRADES,
    minPnlBps: MIN_PNL_BPS,
    minVolumeUsdc: MIN_VOLUME,
  }, { bindingNonce, validFromMs, validUntilMs });
  log.info({ exec: exec.toSuiAddress(), scopeHash: binding.scopeHashHex }, 'signed witnessed binding');

  const mintRes = await run(oathkeeper, buildMintWitnessedPtb({
    coinType: env.dbusdcType,
    maxDrawdownBps: Number(MAX_DRAWDOWN_BPS),
    minTrades: Number(MIN_TRADES),
    minPnlBps: Number(MIN_PNL_BPS),
    minVolumeUsdc: Number(MIN_VOLUME),
    execAddr: exec.toSuiAddress(),
    venue: 0,
    allowedAssets,
    epochDurationMs: Number(EPOCH_MS),
    bond: BOND,
    client,
    clientClaim: CLIENT_CLAIM,
    sealedRoot: process.env.LIVE_WITNESSED_SEALED_ROOT ?? 'live-witnessed-deepbook',
    bindingNonce,
    execSignature: binding.signature,
    execPubkey: binding.pubkey,
    validFromMs,
    validUntilMs,
  }), 'mint-witnessed');
  const minted = eventData(mintRes, '::oath::OathMinted');
  const oathId = minted.oath_id;
  const epochEndMs = Number(minted.epoch_end_ms);
  log.info({ oathId, epochEndMs }, 'witnessed oath minted');

  await run(exec, buildTradeViaDeepBookPtb({
    oathId,
    baseType: '0x2::sui::SUI',
    quoteType: env.dbusdcType,
    poolId: env.suiDbusdcPoolId,
    baseIn: BASE_IN,
    minQuoteOut: MIN_QUOTE_OUT,
  }), 'trade-via-deepbook');

  const waitMs = epochEndMs - Date.now() + 3_000;
  if (waitMs > 0) {
    log.info({ waitMs }, 'waiting for epoch end before witnessed settle');
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const settleRes = await run(deployerKeypair(), buildSettleWitnessedPtb(oathId, env.dbusdcType), 'settle-witnessed');
  log.info({ oathId, settled: eventData(settleRes, '::oath::OathSettled') }, 'live witnessed path complete');
}

async function main() {
  checkSuiCli();
  const exec = signerFromEnv('OATHKEEPER_EXEC_KEY');
  if (mode === 'bootstrap-manager') {
    await bootstrapManager(exec);
    return;
  }
  if (mode !== 'full') throw new Error(`Unknown LIVE_WITNESSED_MODE: ${mode}`);
  await fullRun(signerFromEnv('OATHKEEPER_PROMISER_KEY'), exec);
}

main().catch((e) => {
  log.error({ err: String(e?.message ?? e) }, 'live witnessed DeepBook harness failed');
  process.exit(1);
});
