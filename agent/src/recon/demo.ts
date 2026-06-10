/**
 * Zero-setup reconciliation demo — `pnpm recon:demo`.
 *
 * No chain, no wallet, no gas. Constructs a scenario where an operator attested four
 * fills but only three actually happened on the venue, and shows the reconciler catching
 * the fabricated one deterministically. This is the "verifiable opacity" claim made
 * concrete: anyone can run this and get the identical verdict.
 */
import { reconcile } from './reconcile.js';
import type { AttestedFill, VenueFill } from './types.js';

const OATH = '0xDEMO_oath';

// What the operator ATTESTED on-chain (self-reported) — note 0xFAKE was never traded.
const attested: AttestedFill[] = [
  { oathId: OATH, venueTxHash: '0xa1', asset: 'BTC', pnlDelta: 800n, pnlNegative: false, equityAfter: 100_800n, notional: 1_000n, timestampMs: 1 },
  { oathId: OATH, venueTxHash: '0xb2', asset: 'ETH', pnlDelta: 1_200n, pnlNegative: false, equityAfter: 102_000n, notional: 1_500n, timestampMs: 2 },
  { oathId: OATH, venueTxHash: '0xc3', asset: 'BTC', pnlDelta: 600n, pnlNegative: false, equityAfter: 102_600n, notional: 900n, timestampMs: 3 },
  { oathId: OATH, venueTxHash: '0xFAKE', asset: 'BTC', pnlDelta: 50_000n, pnlNegative: false, equityAfter: 152_600n, notional: 80_000n, timestampMs: 4 },
];

// What the venue (DeepBook) actually RECORDED — the authoritative truth.
const venue: VenueFill[] = [
  { venueTxHash: '0xa1', asset: 'BTC', notional: 1_000n, timestampMs: 1 },
  { venueTxHash: '0xb2', asset: 'ETH', notional: 1_500n, timestampMs: 2 },
  { venueTxHash: '0xc3', asset: 'BTC', notional: 900n, timestampMs: 3 },
];

const report = reconcile(OATH, attested, venue, { authoritative: true, venue: 'deepbook' });

const line = '─'.repeat(64);
console.log(line);
console.log('RECONCILIATION DEMO — operator attested a fill that never happened');
console.log(line);
console.log(`attested fills: ${report.attestedCount}   venue fills: ${report.venueCount}   matched: ${report.matched}`);
for (const f of report.findings) {
  console.log(`  [! ${f.kind}] ${f.detail}`);
}
console.log(line);
console.log(`VERDICT: ${report.verdict.toUpperCase()}  (disputable: ${report.disputable})`);
console.log(
  report.verdict === 'discrepancies'
    ? '→ A Doubter (or anyone) can file dispute_attestation on-chain; the fabrication is provable.'
    : '→ clean',
);
console.log(line);

// Non-zero exit if the demo ever fails to catch the liar — guards against regressions.
process.exit(report.verdict === 'discrepancies' && report.findings.some((f) => f.kind === 'fabricated') ? 0 : 1);
