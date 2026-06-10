import { describe, it, expect } from 'vitest';
import { reconcile, decodeBytes, attestedFillFromEvent } from './reconcile.js';
import type { AttestedFill, VenueFill } from './types.js';

const OATH = '0xoath';
const auth = { authoritative: true, venue: 'deepbook' };

function attested(venueTxHash: string, asset: string, notional: bigint): AttestedFill {
  return {
    oathId: OATH,
    venueTxHash,
    asset,
    pnlDelta: 100n,
    pnlNegative: false,
    equityAfter: 110_000n,
    notional,
    timestampMs: 1,
  };
}

function venueFill(venueTxHash: string, asset: string, notional: bigint): VenueFill {
  return { venueTxHash, asset, notional, timestampMs: 1 };
}

describe('reconcile', () => {
  it('clean: every attested fill is backed by a real venue fill', () => {
    const a = [attested('0xaa', 'BTC', 1000n), attested('0xbb', 'ETH', 500n)];
    const v = [venueFill('0xaa', 'BTC', 1000n), venueFill('0xbb', 'ETH', 500n)];
    const r = reconcile(OATH, a, v, auth);
    expect(r.verdict).toBe('clean');
    expect(r.matched).toBe(2);
    expect(r.findings).toHaveLength(0);
    expect(r.disputable).toBe(false);
  });

  it('catches a FABRICATED fill (attested with no venue backing)', () => {
    const a = [attested('0xaa', 'BTC', 1000n), attested('0xFAKE', 'BTC', 9_000_000n)];
    const v = [venueFill('0xaa', 'BTC', 1000n)];
    const r = reconcile(OATH, a, v, auth);
    expect(r.verdict).toBe('discrepancies');
    expect(r.disputable).toBe(true);
    const fab = r.findings.filter((f) => f.kind === 'fabricated');
    expect(fab).toHaveLength(1);
    expect(fab[0]!.venueTxHash).toBe('0xFAKE');
  });

  it('catches a MISMATCH (real fill id, altered asset/notional)', () => {
    const a = [attested('0xaa', 'BTC', 5000n)]; // operator inflated notional
    const v = [venueFill('0xaa', 'BTC', 1000n)];
    const r = reconcile(OATH, a, v, auth);
    expect(r.verdict).toBe('discrepancies');
    expect(r.disputable).toBe(true);
    expect(r.findings.filter((f) => f.kind === 'mismatch')).toHaveLength(1);
  });

  it('flags a MISSING fill (real fill never attested) but does not make it disputable', () => {
    const a = [attested('0xaa', 'BTC', 1000n)];
    const v = [venueFill('0xaa', 'BTC', 1000n), venueFill('0xbb', 'ETH', 500n)];
    const r = reconcile(OATH, a, v, auth);
    expect(r.findings.filter((f) => f.kind === 'missing')).toHaveLength(1);
    // under-reporting does not inflate performance, so it is informational only
    expect(r.verdict).toBe('clean');
    expect(r.disputable).toBe(false);
  });

  it('UNVERIFIABLE when the venue source is not authoritative (e.g. no Hyperliquid adapter)', () => {
    const a = [attested('0xaa', 'BTC', 1000n)];
    const r = reconcile(OATH, a, [], { authoritative: false, venue: 'hyperliquid' });
    expect(r.verdict).toBe('unverifiable');
    // every attested fill shows as fabricated against an empty record, but the honest
    // verdict is 'unverifiable' — we can't prove fabrication without an authoritative source
    expect(r.disputable).toBe(true);
  });

  it('all-fabricated when an authoritative venue has zero fills but attestations exist', () => {
    // This is exactly the seeded-demo case: venue=deepbook, exec wallet never traded.
    const a = [attested('0xaa', 'BTC', 1000n), attested('0xbb', 'ETH', 500n)];
    const r = reconcile(OATH, a, [], auth);
    expect(r.verdict).toBe('discrepancies');
    expect(r.findings.filter((f) => f.kind === 'fabricated')).toHaveLength(2);
  });

  it('decodeBytes round-trips ASCII from a Move vector<u8>', () => {
    const bytes = Array.from(new TextEncoder().encode('0xdeadbeef:3'));
    expect(decodeBytes(bytes)).toBe('0xdeadbeef:3');
  });

  it('attestedFillFromEvent decodes a raw TradeAttested parsedJson', () => {
    const ev = {
      venue_tx_hash: Array.from(new TextEncoder().encode('0xabc:0')),
      asset: Array.from(new TextEncoder().encode('BTC')),
      pnl_delta: '10000',
      pnl_negative: false,
      equity_after: '110000',
      notional: '1000',
      timestamp_ms: '1700000000000',
    };
    const f = attestedFillFromEvent(OATH, ev);
    expect(f.venueTxHash).toBe('0xabc:0');
    expect(f.asset).toBe('BTC');
    expect(f.notional).toBe(1000n);
    expect(f.equityAfter).toBe(110000n);
  });
});
