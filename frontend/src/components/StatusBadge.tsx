import type { OathStatus } from "@/lib/mock";

/**
 * StatusBadge — oath lifecycle state (Active / Kept / Broken / Settled).
 *
 * Neutral language: Broken is a market-clearing outcome, never "failed".
 * Color is always paired with the label word, never hue-only, so it survives
 * color-blindness and grayscale. Pure presentational.
 */
const STYLES: Record<
  OathStatus,
  { color: string; bg: string; border: string }
> = {
  // Active — gold, the live/in-progress state.
  Active: {
    color: "var(--gold-ink)",
    bg: "var(--gold-dim)",
    border: "transparent",
  },
  // Kept — sage, the oath held.
  Kept: {
    color: "var(--sage-deep)",
    bg: "transparent",
    border: "var(--sage-deep)",
  },
  // Broken — coral, the oath cleared in the Doubters' favor (not "failure").
  Broken: {
    color: "var(--coral-deep)",
    bg: "transparent",
    border: "var(--coral-deep)",
  },
  // Settled — steel, the terminal distributed state.
  Settled: {
    color: "var(--steel-deep)",
    bg: "transparent",
    border: "var(--bone-300)",
  },
};

export default function StatusBadge({ status }: { status: OathStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center font-mono"
      style={{
        fontSize: "0.625rem",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 4,
        color: s.color,
        background: s.bg,
        boxShadow:
          s.border !== "transparent" ? `inset 0 0 0 1px ${s.border}` : "none",
      }}
    >
      {status}
    </span>
  );
}
