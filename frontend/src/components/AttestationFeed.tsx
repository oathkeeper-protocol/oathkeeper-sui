import type { AttestationRow } from "@/lib/mock";
import { usdc, relativeTime, addr } from "@/lib/format";

/**
 * AttestationFeed — dense, reverse-chronological log of attested fills.
 *
 * Feels like a log, not a card list: a tight table with mono columns for
 * relative time, asset, signed PnL (+/- colored), equity after, notional, and
 * a tx-hash link to the explorer. Rows are sorted newest-first here.
 *
 * Pure presentational. `now` is passed in so server/client renders agree.
 */
export default function AttestationFeed({
  rows,
  explorerBase = "https://suiscan.xyz/testnet/tx",
  now,
}: {
  rows: AttestationRow[];
  explorerBase?: string;
  now?: number;
}) {
  const sorted = [...rows].sort((a, b) => b.timestampMs - a.timestampMs);

  if (sorted.length === 0) {
    return (
      <p className="text-sm font-mono" style={{ color: "var(--bone-600)" }}>
        No attestations yet this epoch.
      </p>
    );
  }

  return (
    <div className="font-mono" style={{ fontSize: "0.7rem" }}>
      {/* Header row */}
      <div
        className="grid items-center px-1 pb-1.5"
        style={{
          gridTemplateColumns: "4rem 1fr 5rem 5.5rem 5.5rem 4rem",
          gap: "0.75rem",
          color: "var(--bone-600)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "0.6rem",
          borderBottom: "1px solid var(--bone-200)",
        }}
        aria-hidden="true"
      >
        <span>Time</span>
        <span>Asset</span>
        <span className="text-right">PnL</span>
        <span className="text-right">Equity</span>
        <span className="text-right">Notional</span>
        <span className="text-right">Tx</span>
      </div>

      {/* Data rows */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sorted.map((r, i) => {
          const negative = r.pnlDelta < 0;
          const zero = r.pnlDelta === 0;
          const pnlColor = zero
            ? "var(--bone-600)"
            : negative
              ? "var(--coral-deep)"
              : "var(--sage-deep)";
          const sign = zero ? "" : negative ? "−" : "+";
          return (
            <li
              key={`${r.txHash}-${i}`}
              className="grid items-center px-1 py-1.5"
              style={{
                gridTemplateColumns: "4rem 1fr 5rem 5.5rem 5.5rem 4rem",
                gap: "0.75rem",
                borderBottom: "1px solid var(--bone-200)",
              }}
            >
              <span style={{ color: "var(--bone-600)" }}>
                {relativeTime(r.timestampMs, now)}
              </span>
              <span style={{ color: "var(--bone-800)" }}>{r.asset}</span>
              <span className="text-right tabular-nums" style={{ color: pnlColor }}>
                {sign}
                {usdc(Math.abs(r.pnlDelta))}
              </span>
              <span
                className="text-right tabular-nums"
                style={{ color: "var(--bone-600)" }}
              >
                {usdc(r.equityAfter)}
              </span>
              <span
                className="text-right tabular-nums"
                style={{ color: "var(--bone-600)" }}
              >
                {usdc(r.notional)}
              </span>
              <a
                href={`${explorerBase}/${r.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-right tabular-nums transition-colors"
                style={{ color: "var(--steel-deep)", textDecoration: "none" }}
                title={r.txHash}
              >
                {addr(r.txHash)}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
