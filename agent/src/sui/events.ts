/**
 * Event-shape TypeScript types for every Move event emitted by the Oathkeeper
 * contracts. The Sui SDK returns events with a `parsedJson` field — these types
 * describe its shape. Keep these in sync with the Move structs.
 *
 * Event source-of-truth: `contracts/sources/*.move` `public struct *` blocks
 * marked `has copy, drop` in event modules.
 */

// === oath.move ===

export interface OathMinted {
  oath_id: string; // ID
  promiser: string; // address
  oath_type: { variant: OathTypeVariant };
  bond_amount: string; // u64 (as decimal string in BCS)
  epoch_end_ms: string;
}

export interface OathBroken {
  oath_id: string;
  breach_reason: number; // u8 — see BreachReason
  equity_at_breach: string;
  trade_count_at_breach: string;
}

export interface OathSettled {
  oath_id: string;
  final_status: number; // u8 — 1=KEPT, 2=BROKEN (post-evaluation)
  breach_reason: { vec: number[] }; // Option<u8> as { vec: [...] }
  bond_to_promiser: string;
  residual_to_lp: string;
}

// === doubter.move ===

export interface StakePlaced {
  oath_id: string;
  position_id: string;
  doubter: string;
  claim_amount: string;
  stake_amount: string;
}

export interface DoubterPayout {
  oath_id: string;
  position_id: string;
  doubter: string;
  amount: string;
  outcome: number; // u8 — 1=KEPT, 2=BROKEN
}

// === economics.move ===

export interface PoolCreated {
  pool_id: string;
}

export interface LPDeposit {
  pool_id: string;
  provider: string;
  amount: string;
  shares_minted: string;
}

export interface LPRedeem {
  pool_id: string;
  provider: string;
  shares_burned: string;
  amount: string;
}

export interface PremiumDeposited {
  pool_id: string;
  amount: string;
}

// === attestation.move ===

export interface TradeAttested {
  oath_id: string;
  venue_tx_hash: number[]; // vector<u8>
  asset: number[];
  pnl_delta: string;
  pnl_negative: boolean;
  equity_after: string;
  notional: string;
  timestamp_ms: string;
}

export interface AttestationDisputed {
  oath_id: string;
  venue_tx_hash: number[];
  disputer: string;
}

// === Tag → type mapping ===

export type OathTypeVariant =
  | 'TradingOath'
  | 'UptimeOath'
  | 'BehaviorOath'
  | 'ValidatorOath'
  | 'TreasuryOath';

export const BreachReason = {
  Drawdown: 0,
  MinTrades: 1,
  MinPnl: 2,
  MinVolume: 3,
} as const;

export type BreachReason = (typeof BreachReason)[keyof typeof BreachReason];

export const Status = {
  Active: 0,
  Kept: 1,
  Broken: 2,
  Settled: 3,
} as const;

export type Status = (typeof Status)[keyof typeof Status];

/**
 * Full event-type-string registry. The Move full type for each event is
 * `<package>::<module>::<EventName>`. Resolved at runtime once the package ID
 * is known (post-publish).
 */
export const EventTypes = {
  OathMinted: 'oath::OathMinted',
  OathBroken: 'oath::OathBroken',
  OathSettled: 'oath::OathSettled',
  StakePlaced: 'doubter::StakePlaced',
  DoubterPayout: 'doubter::DoubterPayout',
  PoolCreated: 'economics::PoolCreated',
  LPDeposit: 'economics::LPDeposit',
  LPRedeem: 'economics::LPRedeem',
  PremiumDeposited: 'economics::PremiumDeposited',
  TradeAttested: 'attestation::TradeAttested',
  AttestationDisputed: 'attestation::AttestationDisputed',
} as const;

export type EventTypeKey = keyof typeof EventTypes;

/** Build the fully-qualified Move event type for a given package address. */
export const qualifyEventType = (packageId: string, key: EventTypeKey): string =>
  `${packageId}::${EventTypes[key]}`;
