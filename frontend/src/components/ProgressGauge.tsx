/**
 * ProgressGauge — count progress toward a minimum (e.g. trade_count / min_trades).
 *
 * Fill is gold while below target, sage once the target is met. The target is
 * a floor the operator must reach, so meeting it is the safe state.
 * Pure presentational.
 */
export default function ProgressGauge({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 100;
  const met = current >= target;
  const fillColor = met ? "var(--sage-deep)" : "var(--gold-deep)";
  const valueColor = met ? "var(--sage-deep)" : "var(--gold-deep)";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm" style={{ color: "var(--bone-600)" }}>
          {label}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: "0.8rem", fontWeight: 600, color: valueColor }}
        >
          {current} / {target}
        </span>
      </div>
      <div
        className="w-full overflow-hidden"
        style={{ height: 6, borderRadius: 6, background: "var(--bone-200)" }}
      >
        <div
          style={{ width: `${pct}%`, height: "100%", background: fillColor, borderRadius: 6 }}
          aria-hidden="true"
        />
      </div>
      <div
        className="font-mono mt-1"
        style={{ fontSize: "0.6rem", color: "var(--bone-600)", letterSpacing: "0.03em" }}
      >
        {met ? "minimum met" : `${target - current} to go`}
      </div>
    </div>
  );
}
