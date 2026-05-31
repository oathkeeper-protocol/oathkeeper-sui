/**
 * Mock view-model for the Oathkeeper market app.
 *
 * These shapes are a DECODED view of the on-chain objects/events defined in
 * agent/src/sui/events.ts. The contract emits u64s as strings and addresses /
 * hashes / assets as byte arrays; here amounts are `number` (so StakePanel and
 * FlowDiagram can compute payouts), bps stay as integers, addresses are 0x
 * strings, and assets are readable symbols ("BTC-PERP").
 *
 * 5-role economics only: Oathkeeper, Client, Believer, Doubter, Platform.
 * Settlement splits loser stakes 10% Platform / 20% secondary / 70% winners
 * (see SplitBps in events.ts). NO LP / underwriter / 60-40 / LPPool.
 */

// Contract enums are re-declared locally so the frontend has no build-time
// coupling to the agent workspace. Keep these in sync with
// agent/src/sui/events.ts (OathTypeVariant, Status, BreachReason, SplitBps).

/** Mirrors OathTypeVariant in events.ts. */
export type OathTypeVariant =
  | "TradingOath"
  | "UptimeOath"
  | "BehaviorOath"
  | "ValidatorOath"
  | "TreasuryOath";

/** Mirrors Status in events.ts (Active=0, Kept=1, Broken=2, Settled=3). */
export type OathStatus = "Active" | "Kept" | "Broken" | "Settled";

/** Mirrors BreachReason in events.ts. */
export type BreachReason =
  | "Drawdown"
  | "MinTrades"
  | "MinPnl"
  | "MinVolume";

/** Split constants (basis points) — mirrors SplitBps in events.ts. */
export const SPLIT = {
  /** Platform fee on loser stakes. */
  platformBps: 1000,
  /** Secondary beneficiary share (Oathkeeper on Kept, Client on Broken). */
  secondaryBps: 2000,
  /** Winners' pro-rata share of loser stakes. */
  winnerBps: 7000,
} as const;

/** Operator track record. Mirrors the standing field used by StandingBadge. */
export interface Standing {
  kept: number;
  broken: number;
}

/** The multi-dimensional oath tuple. All values in their on-chain units. */
export interface OathDims {
  /** Equity-floor breach trigger, basis points (2000 = 20% max drawdown). */
  maxDrawdownBps: number;
  /** Minimum fills required by epoch end. Contract rejects mints with < 1. */
  minTrades: number;
  /** Minimum net return, basis points (can be 0). */
  minPnlBps: number;
  /** Optional 4th dimension: minimum traded notional in USDC. 0 = unused. */
  minVolumeUsdc: number;
}

/** A single attested trade fill. Decoded TradeAttested event. */
export interface AttestationRow {
  /** Sui / venue tx hash, 0x string (decoded from venue_tx_hash bytes). */
  txHash: string;
  /** Readable asset symbol, decoded from the asset byte array. */
  asset: string;
  /** Signed PnL delta in USDC (negative encodes pnl_negative=true on-chain). */
  pnlDelta: number;
  /** Account equity after this fill, USDC. */
  equityAfter: number;
  /** Notional traded on this fill, USDC. */
  notional: number;
  /** Absolute fill time, epoch ms. */
  timestampMs: number;
}

/** A staker's open or settled position. Decoded Believer/Doubter events. */
export interface Position {
  positionId: string;
  oathId: string;
  side: "Believer" | "Doubter";
  /** Capital staked, USDC. */
  stakeAmount: number;
  /** Realized payout once settled, USDC (undefined while Active). */
  payout?: number;
}

/** The full decoded oath view-model consumed by every screen. */
export interface Oath {
  oathId: string;
  /** Operator (Oathkeeper) address, 0x string. */
  promiser: string;
  /** Optional human alias the operator publishes for their identity. */
  promiserAlias?: string;
  /** Client (counterparty) address, 0x string. */
  client: string;
  oathType: OathTypeVariant;
  /** Operator principal at risk, USDC. */
  bondAmount: number;
  /** Client's registered claim against the bond, USDC. */
  clientClaim: number;
  /** Plain-language summary of the sealed oath text (the public claim). */
  clientClaimText: string;
  dims: OathDims;
  /** Believer pool total, USDC. */
  totalBelieverStakes: number;
  /** Doubter pool total, USDC. */
  totalDoubterStakes: number;
  /** Live equity, USDC (Trading verticals). */
  currentEquity: number;
  /** Equity at epoch start, USDC — the drawdown reference. */
  startingEquity: number;
  /** Fills recorded so far. */
  tradeCount: number;
  /** Cumulative traded notional, USDC. */
  cumulativeVolume: number;
  /** Epoch end, epoch ms (the settlement boundary). */
  epochEndMs: number;
  status: OathStatus;
  /** Set only on Broken / Settled-from-broken oaths. */
  breachReason?: BreachReason;
  /** Operator track record across prior oaths. */
  standing: Standing;
  /** Asset symbols in scope (Trading verticals). */
  assets: string[];
  /** Attested fills, reverse-chronological at the call site. */
  attestations: AttestationRow[];
}

// ─── Time helpers for stable relative timestamps ────────────────────────────
const NOW = Date.UTC(2026, 4, 31, 14, 0, 0); // 2026-05-31 14:00 UTC, matches build date
const h = (n: number) => n * 3_600_000;
const m = (n: number) => n * 60_000;

// ─── Oaths ──────────────────────────────────────────────────────────────────

export const OATHS: Oath[] = [
  // 1. Trading — Active, believer-heavy, on pace
  {
    oathId: "0x0481",
    promiser: "0x1a3f9c2e7b4d8a6f0e2c5d9b1a3f7e4c8d6b2a5f0e9c3d7b1a4f8e6c2d5b9a3f",
    promiserAlias: "FIGHTER-APOLLO",
    client: "0x4d2bce91a7f30e5c8b6d4a2f1e9c7b5d3a0f8e6c4b2d9a7f5e3c1b8d6a4f2e0c",
    oathType: "TradingOath",
    bondAmount: 1000,
    clientClaim: 250,
    clientClaimText:
      "Holds drawdown to ≤20% across at least 10 trades this epoch.",
    dims: { maxDrawdownBps: 2000, minTrades: 10, minPnlBps: 0, minVolumeUsdc: 0 },
    totalBelieverStakes: 1240,
    totalDoubterStakes: 312,
    currentEquity: 1086,
    startingEquity: 1000,
    tradeCount: 7,
    cumulativeVolume: 41200,
    epochEndMs: NOW + h(2) + m(14),
    status: "Active",
    standing: { kept: 20, broken: 3 },
    assets: ["BTC-PERP", "ETH-PERP"],
    attestations: [
      { txHash: "0x9f2a1c4e", asset: "BTC-PERP", pnlDelta: 34.5, equityAfter: 1086, notional: 8200, timestampMs: NOW - m(8) },
      { txHash: "0x7b3d8e1f", asset: "ETH-PERP", pnlDelta: -12.0, equityAfter: 1051.5, notional: 6100, timestampMs: NOW - m(41) },
      { txHash: "0x2c6a9d4b", asset: "BTC-PERP", pnlDelta: 28.0, equityAfter: 1063.5, notional: 7400, timestampMs: NOW - h(1) - m(12) },
      { txHash: "0x5e1f7a2c", asset: "BTC-PERP", pnlDelta: 19.5, equityAfter: 1035.5, notional: 5800, timestampMs: NOW - h(2) - m(3) },
      { txHash: "0x8d4b2e6f", asset: "ETH-PERP", pnlDelta: -8.0, equityAfter: 1016, notional: 4900, timestampMs: NOW - h(2) - m(55) },
    ],
  },
  // 2. Trading — Active, doubt rising, near the floor
  {
    oathId: "0x0479",
    promiser: "0x6b2d4f8a1c3e9d7b5a0f2e8c6d4b1a9f7e3c5d2b8a6f4e0c1d3b7a5f9e2c4d6b",
    promiserAlias: "VAULT-MERIDIAN",
    client: "0x0c4d6b8a2f1e9c7d5b3a0f8e6c4d2b9a7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d",
    oathType: "TradingOath",
    bondAmount: 5000,
    clientClaim: 1500,
    clientClaimText:
      "Returns ≥5% net over at least 25 trades, drawdown held under 15%.",
    dims: { maxDrawdownBps: 1500, minTrades: 25, minPnlBps: 500, minVolumeUsdc: 250000 },
    totalBelieverStakes: 2100,
    totalDoubterStakes: 3800,
    currentEquity: 4380,
    startingEquity: 5000,
    tradeCount: 18,
    cumulativeVolume: 198000,
    epochEndMs: NOW + h(6) + m(40),
    status: "Active",
    standing: { kept: 11, broken: 6 },
    assets: ["SOL-PERP", "BTC-PERP"],
    attestations: [
      { txHash: "0x1d7f3a9c", asset: "SOL-PERP", pnlDelta: -88.0, equityAfter: 4380, notional: 14200, timestampMs: NOW - m(19) },
      { txHash: "0x4a2e8d6b", asset: "BTC-PERP", pnlDelta: -54.0, equityAfter: 4468, notional: 11900, timestampMs: NOW - h(1) - m(2) },
      { txHash: "0x9c5b1f3d", asset: "SOL-PERP", pnlDelta: 41.0, equityAfter: 4522, notional: 9800, timestampMs: NOW - h(2) - m(30) },
      { txHash: "0x3e8a6d2c", asset: "BTC-PERP", pnlDelta: -102.0, equityAfter: 4481, notional: 16400, timestampMs: NOW - h(3) - m(48) },
    ],
  },
  // 3. Uptime — Active, very low doubt
  {
    oathId: "0x0474",
    promiser: "0x2f8c6d4b0a1e9c7d3b5a0f2e8c6d4b1a9f7e3c5d8b6a4f2e0c1d9b7a5f3e2c4d",
    promiserAlias: "RPC-NORTHGATE",
    client: "0x8a6f4e2c0d1b9a7f5e3c1d8b6a4f2e0c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f",
    oathType: "UptimeOath",
    bondAmount: 2500,
    clientClaim: 800,
    clientClaimText:
      "Maintains ≥99.5% endpoint availability across the epoch.",
    dims: { maxDrawdownBps: 50, minTrades: 1, minPnlBps: 0, minVolumeUsdc: 0 },
    totalBelieverStakes: 940,
    totalDoubterStakes: 60,
    currentEquity: 9982,
    startingEquity: 10000,
    tradeCount: 1,
    cumulativeVolume: 0,
    epochEndMs: NOW + h(19),
    status: "Active",
    standing: { kept: 48, broken: 1 },
    assets: [],
    attestations: [
      { txHash: "0x6c2d8b4a", asset: "PROBE", pnlDelta: 0, equityAfter: 9982, notional: 0, timestampMs: NOW - m(5) },
      { txHash: "0x1f9e3c7d", asset: "PROBE", pnlDelta: 0, equityAfter: 9990, notional: 0, timestampMs: NOW - h(1) - m(5) },
    ],
  },
  // 4. Trading — Active, balanced market, large bond
  {
    oathId: "0x046d",
    promiser: "0x9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f5e3c1d0b8a6f4e2c9d7b",
    promiserAlias: "DELTA-OBSIDIAN",
    client: "0x3b1a0f8e6c4d2b9a7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a",
    oathType: "TradingOath",
    bondAmount: 12000,
    clientClaim: 4000,
    clientClaimText:
      "Returns ≥3% net over at least 40 trades, drawdown under 25%.",
    dims: { maxDrawdownBps: 2500, minTrades: 40, minPnlBps: 300, minVolumeUsdc: 500000 },
    totalBelieverStakes: 6400,
    totalDoubterStakes: 5900,
    currentEquity: 12480,
    startingEquity: 12000,
    tradeCount: 31,
    cumulativeVolume: 612000,
    epochEndMs: NOW + h(11) + m(20),
    status: "Active",
    standing: { kept: 7, broken: 2 },
    assets: ["BTC-PERP", "ETH-PERP", "SOL-PERP"],
    attestations: [
      { txHash: "0x4e2c9d7b", asset: "ETH-PERP", pnlDelta: 120.0, equityAfter: 12480, notional: 22000, timestampMs: NOW - m(12) },
      { txHash: "0x8d6b4a2f", asset: "BTC-PERP", pnlDelta: 88.0, equityAfter: 12360, notional: 19500, timestampMs: NOW - m(54) },
      { txHash: "0x2c9d7b5a", asset: "SOL-PERP", pnlDelta: -45.0, equityAfter: 12272, notional: 13800, timestampMs: NOW - h(1) - m(38) },
    ],
  },
  // 5. Trading — Broken (drawdown breach), awaiting settlement
  {
    oathId: "0x0461",
    promiser: "0x5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f5e3c1d0b8a6f4e2c9d7b5a3f",
    promiserAlias: "GAMMA-CINDER",
    client: "0x7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f5e",
    oathType: "TradingOath",
    bondAmount: 3000,
    clientClaim: 1000,
    clientClaimText:
      "Holds drawdown to ≤18% across at least 15 trades this epoch.",
    dims: { maxDrawdownBps: 1800, minTrades: 15, minPnlBps: 0, minVolumeUsdc: 0 },
    totalBelieverStakes: 1800,
    totalDoubterStakes: 2600,
    currentEquity: 2380,
    startingEquity: 3000,
    tradeCount: 9,
    cumulativeVolume: 88000,
    epochEndMs: NOW - h(1) - m(20),
    status: "Broken",
    breachReason: "Drawdown",
    standing: { kept: 4, broken: 5 },
    assets: ["BTC-PERP"],
    attestations: [
      { txHash: "0x9e7c5d3b", asset: "BTC-PERP", pnlDelta: -240.0, equityAfter: 2380, notional: 18000, timestampMs: NOW - h(1) - m(28) },
      { txHash: "0x1a0f8e6c", asset: "BTC-PERP", pnlDelta: -180.0, equityAfter: 2620, notional: 15200, timestampMs: NOW - h(2) - m(10) },
      { txHash: "0x4d2b9a7f", asset: "BTC-PERP", pnlDelta: -90.0, equityAfter: 2800, notional: 11000, timestampMs: NOW - h(3) - m(2) },
    ],
  },
  // 6. Trading — Kept, awaiting settlement
  {
    oathId: "0x045a",
    promiser: "0x0f8e6c4d2b9a7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e",
    promiserAlias: "SIGMA-VERMILION",
    client: "0x6c4d2b9a7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d",
    oathType: "TradingOath",
    bondAmount: 4000,
    clientClaim: 1200,
    clientClaimText:
      "Returns ≥4% net over at least 20 trades, drawdown under 20%.",
    dims: { maxDrawdownBps: 2000, minTrades: 20, minPnlBps: 400, minVolumeUsdc: 0 },
    totalBelieverStakes: 3200,
    totalDoubterStakes: 1400,
    currentEquity: 4360,
    startingEquity: 4000,
    tradeCount: 23,
    cumulativeVolume: 156000,
    epochEndMs: NOW - m(40),
    status: "Kept",
    standing: { kept: 14, broken: 2 },
    assets: ["ETH-PERP", "SOL-PERP"],
    attestations: [
      { txHash: "0x2b9a7f5e", asset: "ETH-PERP", pnlDelta: 60.0, equityAfter: 4360, notional: 9200, timestampMs: NOW - m(52) },
      { txHash: "0x5d3b1a0f", asset: "SOL-PERP", pnlDelta: 44.0, equityAfter: 4300, notional: 7800, timestampMs: NOW - h(1) - m(40) },
      { txHash: "0x8e6c4d2b", asset: "ETH-PERP", pnlDelta: 38.0, equityAfter: 4256, notional: 6900, timestampMs: NOW - h(2) - m(20) },
    ],
  },
  // 7. Uptime — Settled (Kept), historical
  {
    oathId: "0x0448",
    promiser: "0x3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f5e3c1d",
    promiserAlias: "RPC-EASTWALL",
    client: "0x9a7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f",
    oathType: "UptimeOath",
    bondAmount: 1500,
    clientClaim: 500,
    clientClaimText:
      "Maintained ≥99.9% endpoint availability across the epoch.",
    dims: { maxDrawdownBps: 10, minTrades: 1, minPnlBps: 0, minVolumeUsdc: 0 },
    totalBelieverStakes: 620,
    totalDoubterStakes: 180,
    currentEquity: 10000,
    startingEquity: 10000,
    tradeCount: 1,
    cumulativeVolume: 0,
    epochEndMs: NOW - h(26),
    status: "Settled",
    standing: { kept: 31, broken: 0 },
    assets: [],
    attestations: [
      { txHash: "0x7b5a3f1e", asset: "PROBE", pnlDelta: 0, equityAfter: 10000, notional: 0, timestampMs: NOW - h(26) - m(2) },
    ],
  },
  // 8. Behavior — Settled (Broken), mock-judge attestation, historical
  {
    oathId: "0x0431",
    promiser: "0xc4d2b9a7f5e3c1d0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2",
    promiserAlias: "AGENT-WESTFORD",
    client: "0xd0b8a6f4e2c9d7b5a3f1e0c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f5e3c1d0b8",
    oathType: "BehaviorOath",
    bondAmount: 2000,
    clientClaim: 900,
    clientClaimText:
      "Behavior score ≥80 over the evaluation window. Judge attested (mock).",
    dims: { maxDrawdownBps: 2000, minTrades: 1, minPnlBps: 0, minVolumeUsdc: 0 },
    totalBelieverStakes: 1100,
    totalDoubterStakes: 1700,
    currentEquity: 0,
    startingEquity: 100,
    tradeCount: 1,
    cumulativeVolume: 0,
    epochEndMs: NOW - h(50),
    status: "Settled",
    breachReason: "MinPnl",
    standing: { kept: 2, broken: 3 },
    assets: [],
    attestations: [
      { txHash: "0x3f1e0c8d", asset: "JUDGE", pnlDelta: -64, equityAfter: 0, notional: 0, timestampMs: NOW - h(50) - m(5) },
    ],
  },
];

// ─── Portfolio positions (a connected user's open + settled stakes) ──────────

export const POSITIONS: Position[] = [
  // Open Believer position on the on-pace Apollo oath (#0481)
  { positionId: "0xp01", oathId: "0x0481", side: "Believer", stakeAmount: 200 },
  // Open Doubter position on the floor-pressing Meridian oath (#0479)
  { positionId: "0xp02", oathId: "0x0479", side: "Doubter", stakeAmount: 350 },
  // Settled win: Doubter on the Broken Cinder oath (#0461).
  // payout = 150 + (150/2600)*0.70*1800 (believer pool is the loser pool).
  { positionId: "0xp03", oathId: "0x0461", side: "Doubter", stakeAmount: 150, payout: 222.69 },
  // Settled win: Believer on the Kept Vermilion oath (#045a)
  { positionId: "0xp04", oathId: "0x045a", side: "Believer", stakeAmount: 400, payout: 522.5 },
  // Settled loss: Believer on the Broken Behavior oath (#0431)
  { positionId: "0xp05", oathId: "0x0431", side: "Believer", stakeAmount: 100, payout: 0 },
];

/** The address treated as "you" in the portfolio mock. */
export const SELF_ADDRESS =
  "0xae11b0cc5e9f3d72a14c8d6b4a2f9e7c5d3b1a0f8e6c4d2b9a7f5e3c1d0b8a6f";

/** Look up an oath by id. */
export function getOath(oathId: string): Oath | undefined {
  return OATHS.find((o) => o.oathId === oathId);
}
