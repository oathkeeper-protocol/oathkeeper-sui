/**
 * Browser-side PTB builders (mirror agent/src/sui/ptb.ts, which is proven by the e2e).
 * Returned Transactions are signed via dapp-kit's useSignAndExecuteTransaction.
 *
 * Notes:
 *  - Mint is a single PTB: trading_oath/new_dimensions/new_scope are moveCall results
 *    (not tx.pure), and start_epoch -> bind_exec_wallet must be one PTB (ScopeReservation
 *    is a zero-ability hot potato). venue=1 (Hyperliquid) hits the ecdsa pass-through so no
 *    real exec signature is needed for the demo.
 *  - Coin<USDC> args use coinWithBalance (auto-selects the sender's USDC), not gas.
 */
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { CHAIN, USDC_TYPE } from "./chain-config";

const bytes = (s: string) => Array.from(new TextEncoder().encode(s));
const T = () => [USDC_TYPE];

/** Permissionless faucet: 100,000 test USDC to the signer. */
export function buildFaucetPtb(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CHAIN.packageId}::usdc::faucet`,
    arguments: [tx.object(CHAIN.usdcTreasuryId)],
  });
  return tx;
}

export interface MintArgs {
  maxDrawdownBps: number;
  minTrades: number;
  minPnlBps: number;
  minVolumeUsdc: number;
  execAddr: string;
  venue: number;
  allowedAssets: string[];
  epochDurationMs: number;
  bond: bigint;
  client: string;
  clientClaim: bigint;
  sealedRoot: string;
  bindingNonce: bigint;
  startingEquityUsdc: bigint;
}

export function buildMintOathPtb(a: MintArgs): Transaction {
  const tx = new Transaction();
  const oathType = tx.moveCall({ target: `${CHAIN.packageId}::oath::trading_oath` });
  const dims = tx.moveCall({
    target: `${CHAIN.packageId}::oath::new_dimensions`,
    arguments: [
      tx.pure.u64(a.maxDrawdownBps),
      tx.pure.u64(a.minTrades),
      tx.pure.u64(a.minPnlBps),
      tx.pure.u64(a.minVolumeUsdc),
    ],
  });
  const scope = tx.moveCall({
    target: `${CHAIN.packageId}::oath::new_scope`,
    arguments: [
      tx.pure.address(a.execAddr),
      tx.pure.u8(a.venue),
      tx.pure(bcs.vector(bcs.vector(bcs.u8())).serialize(a.allowedAssets.map(bytes)).toBytes()),
      tx.pure.u64(a.epochDurationMs),
    ],
  });
  const reservation = tx.moveCall({
    target: `${CHAIN.packageId}::oath::start_epoch`,
    typeArguments: T(),
    arguments: [
      tx.object(CHAIN.registryId),
      oathType,
      dims,
      scope,
      coinWithBalance({ type: USDC_TYPE, balance: a.bond }),
      tx.pure.address(a.client),
      tx.pure.u64(a.clientClaim),
      tx.pure.vector("u8", bytes(a.sealedRoot)),
      tx.pure.u64(a.bindingNonce),
      tx.pure.u64(a.startingEquityUsdc),
      tx.object(CHAIN.clockId),
    ],
  });
  tx.moveCall({
    target: `${CHAIN.packageId}::oath::bind_exec_wallet`,
    typeArguments: T(),
    arguments: [
      reservation,
      tx.pure.vector("u8", []),
      tx.pure.vector("u8", []),
      tx.pure.u64(0n),
      tx.pure.u64(9_000_000_000_000n),
      tx.object(CHAIN.registryId),
      tx.object(CHAIN.clockId),
    ],
  });
  return tx;
}

export function buildStakeForPtb(oathId: string, amount: bigint): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CHAIN.packageId}::believer::stake_for`,
    typeArguments: T(),
    arguments: [tx.object(oathId), coinWithBalance({ type: USDC_TYPE, balance: amount }), tx.object(CHAIN.clockId)],
  });
  return tx;
}

export function buildStakeAgainstPtb(oathId: string, amount: bigint): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CHAIN.packageId}::doubter::stake_against`,
    typeArguments: T(),
    arguments: [tx.object(oathId), coinWithBalance({ type: USDC_TYPE, balance: amount }), tx.object(CHAIN.clockId)],
  });
  return tx;
}
