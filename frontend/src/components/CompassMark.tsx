/**
 * CompassMark — the Oathkeeper brand sigil.
 *
 * Ported verbatim from the landing page (src/app/page.tsx): static line-based
 * compass, steel cardinals + gold ordinals. No spin, no animation.
 * Pure presentational; safe in Server Components.
 */
export default function CompassMark({ size = 24 }: { size?: number }) {
  const r = size / 2;
  const c = r;
  const cardinal = "oklch(0.55 0.02 250)"; // steel
  const ordinal = "oklch(0.62 0.15 75)"; // gold
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <line x1={c} y1={1} x2={c} y2={r - 3} stroke={cardinal} strokeWidth={1.5} />
      <line x1={c} y1={r + 3} x2={c} y2={size - 1} stroke={cardinal} strokeWidth={1.5} />
      <line x1={1} y1={c} x2={r - 3} y2={c} stroke={cardinal} strokeWidth={1.5} />
      <line x1={r + 3} y1={c} x2={size - 1} y2={c} stroke={cardinal} strokeWidth={1.5} />
      <line x1={r + 2} y1={r - 2} x2={size - 3} y2={3} stroke={ordinal} strokeWidth={1} />
      <line x1={r - 2} y1={r - 2} x2={3} y2={3} stroke={ordinal} strokeWidth={1} />
      <line x1={r + 2} y1={r + 2} x2={size - 3} y2={size - 3} stroke={ordinal} strokeWidth={1} />
      <line x1={r - 2} y1={r + 2} x2={3} y2={size - 3} stroke={ordinal} strokeWidth={1} />
      <circle cx={c} cy={c} r={1.5} fill={cardinal} />
    </svg>
  );
}
