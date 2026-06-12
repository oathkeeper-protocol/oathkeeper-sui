import type { OathDims } from "@/lib/mock";
import { bpsToPct, usdc } from "@/lib/format";

/**
 * DimChips — compact mono chips summarising the oath tuple.
 *
 * Renders only the active dimensions: drawdown ceiling, min trades, min PnL,
 * and (if non-zero) min volume. A min_volume of 0 is omitted entirely, matching
 * the "hide that gauge" rule in DESIGN.md. Pure presentational.
 */
export default function DimChips({ dims }: { dims: OathDims }) {
  const chips: string[] = [];
  chips.push(`≤${bpsToPct(dims.maxDrawdownBps)} DD`);
  chips.push(`≥${dims.minTrades} trades`);
  if (dims.minPnlBps > 0) chips.push(`≥${bpsToPct(dims.minPnlBps)} PnL`);
  if (dims.minVolumeUsdc > 0) chips.push(`≥${usdc(dims.minVolumeUsdc)} vol`);

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c}
          className="font-mono"
          style={{
            fontSize: "0.625rem",
            fontWeight: 500,
            color: "var(--bone-600)",
            background: "var(--cream-deep)",
            padding: "2px 7px",
            borderRadius: 4,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
