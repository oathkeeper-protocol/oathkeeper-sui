import type { Oath } from "@/lib/mock";

type Tier = NonNullable<Oath["verifiabilityTier"]>;

const COPY: Record<Tier, { label: string; title: string; color: string; border: string; background: string }> = {
  WITNESSED: {
    label: "WITNESSED",
    title:
      "DeepBook path: routed fills are captured by the oath and drawdown survival is anchored by BalanceManager balance() reads.",
    color: "var(--sage-deep)",
    border: "var(--sage-deep)",
    background: "var(--cream-deep)",
  },
  SELF_REPORTED: {
    label: "SELF_REPORTED",
    title:
      "Operator reports trade data. Settlement is on-chain, but the reconciler is the non-gating check against fabricated fills.",
    color: "var(--bone-600)",
    border: "var(--bone-200)",
    background: "transparent",
  },
};

export default function TierBadge({
  tier = "SELF_REPORTED",
  compact = false,
}: {
  tier?: Tier;
  compact?: boolean;
}) {
  const copy = COPY[tier];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono"
      style={{
        fontSize: compact ? "0.55rem" : "0.62rem",
        fontWeight: 600,
        letterSpacing: compact ? "0.06em" : "0.04em",
        color: copy.color,
        background: copy.background,
        border: `1px solid ${copy.border}`,
        borderRadius: 6,
        padding: compact ? "0.18rem 0.38rem" : "0.25rem 0.5rem",
        whiteSpace: "nowrap",
      }}
      title={copy.title}
    >
      <span
        aria-hidden="true"
        style={{
          width: compact ? 4 : 5,
          height: compact ? 4 : 5,
          borderRadius: "50%",
          background: copy.color,
        }}
      />
      {copy.label}
    </span>
  );
}
