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
