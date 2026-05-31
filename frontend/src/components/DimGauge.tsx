/**
 * DimGauge — a value-vs-floor gauge for one oath dimension.
 *
 * Shows the current value, a breach-floor marker, and a track whose fill is
 * sage while safe and coral once the value crosses into breach territory.
 * Functional instrument, not decoration.
 *
 * `inverted` = lower is better (drawdown: breach when current >= floor).
 * Default   = higher is better (pnl / volume: breach when current < floor).
 *
 * Pure presentational. Caller supplies already-decoded display values + unit.
 */
export default function DimGauge({
  label,
  current,
  floor,
  max,
  unit = "%",
  inverted = false,
  formatValue,
}: {
  label: string;
  current: number;
  floor: number;
  /** Track maximum for scaling. Defaults to 1.5x the larger of current/floor. */
  max?: number;
  unit?: string;
  inverted?: boolean;
  /** Optional custom formatter for the numeric readout (e.g. comma USDC). */
  formatValue?: (v: number) => string;
}) {
  const scaleMax = max ?? (Math.max(current, floor) * 1.5 || 1);
  const clamp = (v: number) => Math.max(0, Math.min(100, (v / scaleMax) * 100));
  const curPct = clamp(current);
  const floorPct = clamp(floor);

  const breached = inverted ? current >= floor : current < floor;
  const fillColor = breached ? "var(--coral-deep)" : "var(--sage-deep)";
  const valueColor = breached ? "var(--coral-deep)" : "var(--sage-deep)";

  const fmt = formatValue ?? ((v: number) => `${v}${unit}`);

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
          {fmt(current)}
        </span>
      </div>
      <div
        className="relative w-full"
        style={{
          height: 6,
          borderRadius: 6,
          background: "var(--bone-200)",
          overflow: "visible",
        }}
      >
        {/* Filled portion up to the current value */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${curPct}%`,
            background: fillColor,
            borderRadius: 6,
          }}
          aria-hidden="true"
        />
        {/* Floor marker */}
        <div
          style={{
            position: "absolute",
            left: `${floorPct}%`,
            top: -3,
            bottom: -3,
            width: 2,
            background: "var(--bone-600)",
            borderRadius: 2,
          }}
          aria-hidden="true"
        />
      </div>
      <div
        className="flex justify-between font-mono mt-1"
        style={{ fontSize: "0.6rem", color: "var(--bone-600)", letterSpacing: "0.03em" }}
      >
        <span>{inverted ? "ceiling" : "floor"}: {fmt(floor)}</span>
        <span>{breached ? "breached" : "holding"}</span>
      </div>
    </div>
  );
}
