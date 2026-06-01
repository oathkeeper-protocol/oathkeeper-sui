import { usdc } from "@/lib/format";

/**
 * SentimentBar — the market price of reliability.
 *
 * Two-segment horizontal bar: left = Believer stake total (sage),
 * right = Doubter stake total (coral). Mono USDC labels beneath.
 *
 * This is NOT a probability bar. It shows the relative size of two capital
 * pools, not an implied likelihood. Pure presentational.
 */
export default function SentimentBar({
  believerTotal,
  doubterTotal,
  height = 6,
  showLabels = true,
}: {
  believerTotal: number;
  doubterTotal: number;
  height?: number;
  showLabels?: boolean;
}) {
  const total = believerTotal + doubterTotal;
  // Fall back to an even split visual when no capital is staked yet.
  const believerPct = total > 0 ? (believerTotal / total) * 100 : 50;
  const doubterPct = 100 - believerPct;

  return (
    <div>
      <div
        className="flex w-full overflow-hidden"
        style={{
          height,
          borderRadius: height,
          background: "var(--bone-200)",
        }}
        role="img"
        aria-label={`Believers ${usdc(believerTotal)} USDC, Doubters ${usdc(
          doubterTotal,
        )} USDC`}
      >
        <div
          style={{ width: `${believerPct}%`, background: "var(--sage)" }}
          aria-hidden="true"
        />
        <div
          style={{ width: `${doubterPct}%`, background: "var(--coral)" }}
          aria-hidden="true"
        />
      </div>
      {showLabels && (
        <div
          className="flex justify-between font-mono tabular-nums mt-1.5"
          style={{ fontSize: "0.625rem", letterSpacing: "0.02em" }}
        >
          <span style={{ color: "var(--sage-deep)" }}>
            Believers {usdc(believerTotal)}
          </span>
          <span style={{ color: "var(--coral-deep)" }}>
            Doubters {usdc(doubterTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
