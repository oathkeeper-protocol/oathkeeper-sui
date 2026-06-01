/**
 * PTB builders for every Oathkeeper flow. Each returns a Transaction ready to sign.
 *
 * The load-bearing subtleties (per the integration review):
 *  - Mint is a SINGLE PTB: trading_oath/new_dimensions/new_scope are struct constructors
 *    called as moveCalls (NOT tx.pure), and start_epoch -> bind_exec_wallet must be in the
 *    same PTB because ScopeReservation is a zero-ability hot potato.
 *  - allowed_assets is vector<vector<u8>>, serialized with nested bcs.
 *  - Stakes/bond are Coin<USDC> (type T), provided via coinWithBalance (auto-selects the
 *    sender's USDC coins), NOT split from gas (gas is SUI).
 */
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { CLOCK_ID, env, usdcType, bytes } from './client.js';

const P = () => env.packageId;
const T = () => [usdcType()];

function allowedAssetsArg(tx: Transaction, assets: string[]) {
  const nested = assets.map((a) => bytes(a));
  return tx.pure(bcs.vector(bcs.vector(bcs.u8())).serialize(nested).toBytes());
}

export interface MintOpts {
  maxDrawdownBps: number;
  minTrades: number;
  minPnlBps: number;
  minVolumeUsdc: number;
  execAddr: string;
  venue: number; // 0 DeepBook (ed25519), 1 Hyperliquid (ecdsa pass-through)
  allowedAssets: string[];
  epochDurationMs: number;
  bond: bigint;
  client: string;
  clientClaim: bigint;
  sealedRoot: string;
  bindingNonce: bigint;
  startingEquityUsdc: bigint;
  execSignature: number[]; // raw ed25519 sig bytes for venue=0; [] for venue=1 pass-through
  execPubkey: number[];
  validFromMs: bigint;
  validUntilMs: bigint;
}

export function buildMintOathPtb(o: MintOpts): Transaction {
  const tx = new Transaction();
  const oathType = tx.moveCall({ target: `${P()}::oath::trading_oath` });
  const dims = tx.moveCall({
    target: `${P()}::oath::new_dimensions`,
    arguments: [
      tx.pure.u64(o.maxDrawdownBps),
      tx.pure.u64(o.minTrades),
      tx.pure.u64(o.minPnlBps),
      tx.pure.u64(o.minVolumeUsdc),
    ],
  });
  const scope = tx.moveCall({
    target: `${P()}::oath::new_scope`,
    arguments: [
      tx.pure.address(o.execAddr),
      tx.pure.u8(o.venue),
      allowedAssetsArg(tx, o.allowedAssets),
      tx.pure.u64(o.epochDurationMs),
    ],
  });
  const reservation = tx.moveCall({
    target: `${P()}::oath::start_epoch`,
    typeArguments: T(),
    arguments: [
      tx.object(env.registryId),
      oathType,
      dims,
      scope,
      coinWithBalance({ type: usdcType(), balance: o.bond }),
      tx.pure.address(o.client),
      tx.pure.u64(o.clientClaim),
      tx.pure.vector('u8', bytes(o.sealedRoot)),
      tx.pure.u64(o.bindingNonce),
      tx.pure.u64(o.startingEquityUsdc),
      tx.object(CLOCK_ID),
    ],
  });
  tx.moveCall({
    target: `${P()}::oath::bind_exec_wallet`,
    typeArguments: T(),
    arguments: [
      reservation,
      tx.pure.vector('u8', o.execSignature),
      tx.pure.vector('u8', o.execPubkey),
      tx.pure.u64(o.validFromMs),
      tx.pure.u64(o.validUntilMs),
      tx.object(env.registryId),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildStakeForPtb(oathId: string, amount: bigint): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::believer::stake_for`,
    typeArguments: T(),
    arguments: [tx.object(oathId), coinWithBalance({ type: usdcType(), balance: amount }), tx.object(CLOCK_ID)],
  });
  return tx;
}

export function buildStakeAgainstPtb(oathId: string, amount: bigint): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::doubter::stake_against`,
    typeArguments: T(),
    arguments: [tx.object(oathId), coinWithBalance({ type: usdcType(), balance: amount }), tx.object(CLOCK_ID)],
  });
  return tx;
}

export interface TradeOpts {
  oathId: string;
  venueTxHash: string;
  asset: string;
  pnlDelta: bigint;
  pnlNegative: boolean;
  equityAfter: bigint;
  notional: bigint;
}

/** Records N identical trades in ONE PTB (signed by the exec wallet). */
export function buildRecordTradesPtb(o: TradeOpts, count: number): Transaction {
  const tx = new Transaction();
  for (let i = 0; i < count; i++) {
    tx.moveCall({
      target: `${P()}::attestation::record_trade`,
      typeArguments: T(),
      arguments: [
        tx.object(o.oathId),
        tx.pure.vector('u8', bytes(o.venueTxHash + ':' + i)),
        tx.pure.vector('u8', bytes(o.asset)),
        tx.pure.u64(o.pnlDelta),
        tx.pure.bool(o.pnlNegative),
        tx.pure.u64(o.equityAfter),
        tx.pure.u64(o.notional),
        tx.object(CLOCK_ID),
      ],
    });
  }
  return tx;
}

export function buildSettlePtb(oathId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::oath::settle_epoch`,
    typeArguments: T(),
    arguments: [tx.object(oathId), tx.object(env.registryId), tx.object(CLOCK_ID)],
  });
  return tx;
}

export function buildBelieverClaimPtb(positionId: string, oathId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::believer::claim_payout`,
    typeArguments: T(),
    arguments: [tx.object(positionId), tx.object(oathId)],
  });
  return tx;
}

export function buildDoubterClaimPtb(positionId: string, oathId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::doubter::claim_payout`,
    typeArguments: T(),
    arguments: [tx.object(positionId), tx.object(oathId)],
  });
  return tx;
}

/**
 * File a dispute against a recorded attestation. `venueTxHash` is the attested fill the
 * reconciler found unbacked; `evidence` is an opaque reference (e.g. a Walrus blob id of the
 * reconciliation report). Works against both the &Oath (event-only) and &mut Oath (durable
 * dispute record) signatures — the PTB passes the shared object either way.
 */
export function buildDisputePtb(oathId: string, venueTxHash: string, evidence: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::attestation::dispute_attestation`,
    typeArguments: T(),
    arguments: [
      tx.object(oathId),
      tx.pure.vector('u8', bytes(venueTxHash)),
      tx.pure.vector('u8', bytes(evidence)),
    ],
  });
  return tx;
}

/** Mint mock USDC to a recipient (signed by the TreasuryCap holder = deployer). */
export function buildMintUsdcPtb(amount: bigint, recipient: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${P()}::usdc::mint`,
    arguments: [tx.object(env.usdcTreasuryId), tx.pure.u64(amount), tx.pure.address(recipient)],
  });
  return tx;
}
