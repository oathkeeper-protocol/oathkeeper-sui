/**
 * Reconciliation types.
 *
 * The reconciler is the open-source, deterministic verifier that closes Oathkeeper's
 * central trust gap: `record_trade` lets the bound exec wallet self-report equity/volume/
 * count, and settlement enforces the SLA dimensions against those self-reported numbers.
 * The reconciler independently re-derives the truth from the venue's OWN fill history and
 * diffs it against what the operator attested. A fabricated or altered fill is provable by
 * anyone — that is what makes "verifiable opacity" true at the attestation layer (for
 * venues whose fills are themselves observable; DeepBook on Sui is the trustless case).
 *
 * Trust boundary (be precise): the reconciler makes DETECTION trustless + deterministic.
 * Turning a detected discrepancy into automatic slashing is the bonded-optimistic dispute
 * layer (see contracts/sources/attestation.move `dispute_attestation` + ARCHITECTURE.md).
 */

/** One fill the operator attested on-chain, decoded from a `TradeAttested` event. */
export interface AttestedFill {
  oathId: string;
  /** The venue's own fill/tx identifier the operator claims this attestation corresponds to. */
  venueTxHash: string;
  asset: string;
  pnlDelta: bigint;
  pnlNegative: boolean;
  equityAfter: bigint;
  notional: bigint;
  timestampMs: number;
}

/** One fill as observed from the venue's authoritative record (DeepBook on Sui, etc.). */
export interface VenueFill {
  /** Must match the `venueTxHash` the operator attests for a fill to reconcile. */
  venueTxHash: string;
  asset: string;
  notional: bigint;
  timestampMs: number;
}

export type FindingKind =
  | 'fabricated' // attested, but no matching fill in the venue's record
  | 'mismatch' // matched by id, but asset/notional disagree with the venue
  | 'missing'; // present in the venue's record, but never attested (under-reporting)

export interface Finding {
  kind: FindingKind;
  venueTxHash: string;
  detail: string;
  attested?: AttestedFill;
  venue?: VenueFill;
}

export type Verdict =
  | 'clean' // every attested fill is backed by a real venue fill
  | 'discrepancies' // at least one fabricated or mismatched fill — operator inflated performance
  | 'unverifiable'; // no authoritative venue source for this venue (e.g. Hyperliquid adapter not wired)

export interface ReconciliationReport {
  oathId: string;
  /** The venue the oath is bound to ('deepbook' | 'hyperliquid'). */
  venue: string;
  attestedCount: number;
  venueCount: number;
  matched: number;
  findings: Finding[];
  verdict: Verdict;
  /** True iff at least one finding is fabricated/mismatch — i.e. a dispute is substantiated. */
  disputable: boolean;
}
