/**
 * Event-shape TypeScript types for every Move event emitted by the Oathkeeper
 * v2 contracts. Keep these in sync with the Move structs.
 */

// === oath.move ===

export interface OathMinted {
  oath_id: string;
  promiser: string;
  client: string;
  oath_type: { variant: OathTypeVariant };
  bond_amount: string;
  client_claim: string;
  epoch_end_ms: string;
}

export interface OathBroken {
  oath_id: string;
  breach_reason: number;
  equity_at_breach: string;
  trade_count_at_breach: string;
}

export interface OathSettled {
  oath_id: string;
  final_status: number;
  breach_reason: { vec: number[] };
  bond_to_promiser: string;
  bond_to_client: string;
  bond_residual_to_platform: string;
  loser_to_platform: string;
  loser_to_secondary: string;
  loser_to_winners: string;
}

// === believer.move ===

export interface BelieverStaked {
  oath_id: string;
  position_id: string;
  believer: string;
  stake_amount: string;
}

export interface BelieverPayout {
  oath_id: string;
  position_id: string;
  believer: string;
  amount: string;
}

// === doubter.move ===

export interface DoubterStaked {
  oath_id: string;
  position_id: string;
  doubter: string;
  stake_amount: string;
}

export interface DoubterPayout {
  oath_id: string;
  position_id: string;
  doubter: string;
  amount: string;
}

// === attestation.move ===

export interface TradeAttested {
  oath_id: string;
  venue_tx_hash: number[];
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
  dispute_count: string;
}

// === Enums + constants ===

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

export const SplitBps = {
  Platform: 1000,
  Secondary: 2000,
  Winner: 7000,
} as const;

export const EventTypes = {
  OathMinted: 'oath::OathMinted',
  OathBroken: 'oath::OathBroken',
  OathSettled: 'oath::OathSettled',
  BelieverStaked: 'believer::BelieverStaked',
  BelieverPayout: 'believer::BelieverPayout',
  DoubterStaked: 'doubter::DoubterStaked',
  DoubterPayout: 'doubter::DoubterPayout',
  TradeAttested: 'attestation::TradeAttested',
  AttestationDisputed: 'attestation::AttestationDisputed',
} as const;

export type EventTypeKey = keyof typeof EventTypes;

export const qualifyEventType = (packageId: string, key: EventTypeKey): string =>
  `${packageId}::${EventTypes[key]}`;
