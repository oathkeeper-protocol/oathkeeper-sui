/**
 * Pure, deterministic reconciliation core.
 *
 * No I/O, no clock, no randomness — given the same inputs it always returns the same
 * report. That determinism is the point: anyone can re-run it on public data and get the
 * identical verdict, so a discrepancy is not an opinion, it's a proof. Kept free of SDK
 * imports so it is trivially unit-testable (see reconcile.test.ts).
 */
import type {
  AttestedFill,
  VenueFill,
  Finding,
  ReconciliationReport,
  Verdict,
} from './types.js';

/** ASCII/utf8 bytes (number[]) from a Move `vector<u8>` event field -> string. */
export function decodeBytes(b: number[] | Uint8Array): string {
  return new TextDecoder().decode(Uint8Array.from(b));
}

function key(asset: string, notional: bigint): string {
  return `${asset}|${notional.toString()}`;
}

export interface ReconcileOpts {
  /**
   * Whether the venue source is authoritative for this venue. DeepBook on Sui is
   * authoritative (the chain holds every fill). If false (e.g. no adapter for the venue),
   * we cannot prove fabrication, so the verdict is 'unverifiable' rather than 'clean'.
   */
  authoritative: boolean;
  venue: string;
  /**
   * When true, the venue source can only attest that a fill EXISTS (by id/digest), not its
   * asset/notional — so skip the mismatch check and detect fabricated/missing only. The
   * live DeepBook adapter sets this in v1 (digest-existence proof); fixture sources don't.
   */
  existenceOnly?: boolean;
}

/**
 * Diff what the operator attested against what the venue actually recorded.
 *
 * Matching is by `venueTxHash` (the operator's claimed reference to a real fill):
 *  - attested hash with no venue fill  -> FABRICATED (inflates performance, disputable)
 *  - attested hash present but asset/notional disagree -> MISMATCH (disputable)
 *  - venue fill never attested         -> MISSING (under-reporting; informational, not disputable)
 */
export function reconcile(
  oathId: string,
  attested: AttestedFill[],
  venue: VenueFill[],
  opts: ReconcileOpts,
): ReconciliationReport {
  const venueByHash = new Map<string, VenueFill>();
  for (const v of venue) venueByHash.set(v.venueTxHash, v);

  const attestedHashes = new Set(attested.map((a) => a.venueTxHash));
  const findings: Finding[] = [];
  let matched = 0;

  for (const a of attested) {
    const v = venueByHash.get(a.venueTxHash);
    if (!v) {
      findings.push({
        kind: 'fabricated',
        venueTxHash: a.venueTxHash,
        detail: `attested fill ${a.venueTxHash} (${a.asset}, notional ${a.notional}) has no matching fill in the ${opts.venue} record`,
        attested: a,
      });
      continue;
    }
    if (!opts.existenceOnly && key(a.asset, a.notional) !== key(v.asset, v.notional)) {
      findings.push({
        kind: 'mismatch',
        venueTxHash: a.venueTxHash,
        detail: `attested ${a.asset}/${a.notional} but venue recorded ${v.asset}/${v.notional}`,
        attested: a,
        venue: v,
      });
      continue;
    }
    matched += 1;
  }

  for (const v of venue) {
    if (!attestedHashes.has(v.venueTxHash)) {
      findings.push({
        kind: 'missing',
        venueTxHash: v.venueTxHash,
        detail: `venue fill ${v.venueTxHash} (${v.asset}, notional ${v.notional}) was never attested on-chain`,
        venue: v,
      });
    }
  }

  const hasSubstantiatedDispute =
    opts.authoritative && findings.some((f) => f.kind === 'fabricated' || f.kind === 'mismatch');

  let verdict: Verdict;
  if (!opts.authoritative) {
    verdict = 'unverifiable';
  } else if (hasSubstantiatedDispute) {
    verdict = 'discrepancies';
  } else {
    verdict = 'clean';
  }

  return {
    oathId,
    venue: opts.venue,
    attestedCount: attested.length,
    venueCount: venue.length,
    matched,
    findings,
    verdict,
    disputable: hasSubstantiatedDispute,
  };
}

/** Decode a raw `TradeAttested` parsedJson event into an AttestedFill. */
export function attestedFillFromEvent(oathId: string, e: {
  venue_tx_hash: number[];
  asset: number[];
  pnl_delta: string;
  pnl_negative: boolean;
  equity_after: string;
  notional: string;
  timestamp_ms: string;
}): AttestedFill {
  return {
    oathId,
    venueTxHash: decodeBytes(e.venue_tx_hash),
    asset: decodeBytes(e.asset),
    pnlDelta: BigInt(e.pnl_delta),
    pnlNegative: e.pnl_negative,
    equityAfter: BigInt(e.equity_after),
    notional: BigInt(e.notional),
    timestampMs: Number(e.timestamp_ms),
  };
}
