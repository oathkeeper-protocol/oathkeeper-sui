import type { Standing } from "@/lib/mock";

/**
 * StandingBadge — an operator's W/L track record as a row of small squares.
 *
 * Sage squares = kept, coral squares = broken, rendered most-recent-first by
 * convention (kept then broken here, summarised). Readable at <=24px height.
 * Capped at `max` squares; overflow is summarised as a "+N" count so a long
 * history stays glanceable. Pure presentational.
 */
export default function StandingBadge({
  standing,
  size = 9,
  gap = 3,
  max = 12,
}: {
  standing: Standing;
  size?: number;
  gap?: number;
  max?: number;
}) {
  const total = standing.kept + standing.broken;
  const pct = total > 0 ? Math.round((standing.kept / total) * 100) : 0;

  // Build the visible square sequence: kept first, then broken, capped at `max`.
  const shown = Math.min(total, max);
  const keptShown = Math.round((standing.kept / Math.max(total, 1)) * shown);
  const brokenShown = shown - keptShown;
  const overflow = total - shown;

  const squares: ("kept" | "broken")[] = [
    ...Array<"kept">(keptShown).fill("kept"),
    ...Array<"broken">(brokenShown).fill("broken"),
  ];

  const label =
    total === 0
      ? "No prior oaths"
      : `${standing.kept} kept, ${standing.broken} broken (${pct}% kept)`;

  return (
    <span
      className="inline-flex items-center"
      style={{ gap }}
      title={label}
      aria-label={label}
      role="img"
    >
      {squares.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            borderRadius: 2,
            background:
              s === "kept" ? "var(--sage-deep)" : "var(--coral-deep)",
          }}
        />
      ))}
      {overflow > 0 && (
        <span
          className="font-mono"
          style={{
            fontSize: size + 1,
            lineHeight: 1,
            color: "var(--bone-400)",
            marginLeft: 1,
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
