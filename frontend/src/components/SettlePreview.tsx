import type { Oath } from "@/lib/mock";
import StatusBadge from "./StatusBadge";
import FlowDiagram from "./FlowDiagram";

/**
 * SettlePreview — inline settlement preview shown on the oath detail page.
 *
 * Reading order per DESIGN.md (Settlement):
 *   1. Outcome (Kept/Broken + reason)
 *   2. Money flow diagram (where every dollar goes)
 *   3. Conservation check (inside FlowDiagram)
 *
 * Presentational. The actual irreversible Settle action is the separate
 * <SettleConfirm> modal; this preview just shows what settlement will do.
 * `outcome` is derived by the caller from the oath status (Kept/Broken).
 */
export default function SettlePreview({
  oath,
  outcome,
}: {
  oath: Oath;
  outcome: "Kept" | "Broken";
}) {
  const witnessed = (oath.verifiabilityTier ?? "SELF_REPORTED") === "WITNESSED";

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 12,
        padding: "1.25rem",
      }}
    >
      {/* 1. Outcome */}
      <div className="flex items-center justify-between mb-1">
        <h3
          className="font-semibold"
          style={{ fontSize: "1rem", color: "var(--bone-950)" }}
        >
          Settlement preview
        </h3>
        <StatusBadge status={oath.status} />
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--bone-600)" }}>
        {outcome === "Kept"
          ? "The oath held across every dimension. Distribution favors the Oathkeeper and Believers."
          : `The oath broke${
              oath.breachReason ? ` on ${oath.breachReason}` : ""
            }. Distribution favors the Client and Doubters.`}
      </p>
      <div
        className="mb-5"
        style={{
          background: "var(--cream-deep)",
          border: "1px solid var(--bone-200)",
          borderRadius: 8,
          padding: "0.75rem 0.85rem",
        }}
      >
        <p
          className="font-mono mb-1"
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: witnessed ? "var(--sage-deep)" : "var(--bone-600)",
          }}
        >
          {witnessed ? "Final anchor: BalanceManager balance()" : "Final anchor: reported oath fields"}
        </p>
        <p style={{ fontSize: "0.78rem", lineHeight: 1.5, color: "var(--bone-800)" }}>
          {witnessed
            ? "WITNESSED settlement must read the DeepBook BalanceManager one last time before distribution, so drawdown survival resolves from chain state instead of operator input."
            : "SELF_REPORTED settlement distributes from the oath fields already submitted by the bound exec wallet; reconciler disputes are evidence, not a settle-time gate."}
        </p>
      </div>

      {/* 2 + 3. Money flow + conservation */}
      <FlowDiagram
        outcome={outcome}
        bondAmount={oath.bondAmount}
        clientClaim={oath.clientClaim}
        believerPool={oath.totalBelieverStakes}
        doubterPool={oath.totalDoubterStakes}
      />
    </div>
  );
}
