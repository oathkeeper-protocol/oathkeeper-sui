"use client";

import { useState } from "react";
import type { Oath } from "@/lib/mock";
import SettleConfirm from "@/components/SettleConfirm";

/**
 * DetailActionBar — the sticky bottom action strip for the oath detail screen.
 *
 * Screen-local client leaf (holds modal + pending state). It enforces the
 * "Absent until valid" rule from DESIGN.md: actions are NOT rendered as
 * disabled buttons, they simply do not appear until they can be taken.
 *
 *   Active, equity below floor   -> Mark Breach
 *   Active/resolved, epoch ended -> Settle (opens the irreversible confirm modal)
 *   Settled / past resolution    -> Claim Payout
 *
 * Settlement is permissionless on-chain (anyone can trigger it), so the bar
 * notes that. There is no glassmorphism here — solid cream with a 1px top rule,
 * matching the AppNav treatment.
 */
export default function DetailActionBar({
  oath,
  outcome,
  breached,
  epochEnded,
  resolved,
}: {
  oath: Oath;
  outcome: "Kept" | "Broken";
  /** current_equity < drawdown floor — the mid-epoch breach trigger. */
  breached: boolean;
  /** now >= epoch end — the settlement boundary. */
  epochEnded: boolean;
  /** Status is not Active (Kept / Broken / Settled). */
  resolved: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [settled, setSettled] = useState(oath.status === "Settled");
  const [claimed, setClaimed] = useState(false);
  const [breachFlagged, setBreachFlagged] = useState(false);

  // Mark Breach only while still live, the equity floor is broken, and the
  // breach has not already been flagged this session.
  const showMarkBreach = oath.status === "Active" && breached && !breachFlagged;
  // Settle once the epoch has ended and the oath has not been settled yet.
  const showSettle = epochEnded && !settled;
  // Claim once the oath is in a settled/terminal distributed state.
  const showClaim = settled;

  // Nothing actionable: still show the bar with a neutral note while live, but
  // drop it entirely when nothing is pending and the user can do nothing.
  const hasAction = showMarkBreach || showSettle || showClaim;
  if (!hasAction && resolved) return null;

  const confirmSettle = () => {
    setPending(true);
    // Mock: settlement is the on-chain tx the screen would dispatch here.
    setTimeout(() => {
      setPending(false);
      setConfirmOpen(false);
      setSettled(true);
    }, 600);
  };

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "var(--cream)",
          borderTop: "1px solid var(--bone-200)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <p
            className="font-mono"
            style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
          >
            {breachFlagged && oath.status === "Active"
              ? "Breach recorded on-chain. The oath can be settled once the epoch ends."
              : showMarkBreach || showSettle
                ? "Permissionless: anyone can trigger this on-chain."
                : showClaim
                  ? "Distribution is final and settled on-chain."
                  : "No action available yet. Actions appear once valid."}
          </p>

          <div className="flex items-center gap-3">
            {showMarkBreach && (
              <button
                type="button"
                className="btn-secondary"
                style={{
                  color: "var(--coral-deep)",
                  borderColor: "var(--coral-deep)",
                }}
                onClick={() => setBreachFlagged(true)}
              >
                Mark breach
              </button>
            )}

            {showSettle && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setConfirmOpen(true)}
              >
                Settle oath
              </button>
            )}

            {showClaim && (
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: claimed ? "var(--sage-deep)" : undefined,
                  cursor: claimed ? "default" : "pointer",
                  opacity: claimed ? 0.85 : 1,
                }}
                disabled={claimed}
                onClick={() => setClaimed(true)}
              >
                {claimed ? "Payout claimed" : "Claim payout"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Irreversible settle confirm — the one modal the app justifies. */}
      <SettleConfirm
        oath={oath}
        outcome={outcome}
        open={confirmOpen}
        onClose={() => !pending && setConfirmOpen(false)}
        onConfirm={confirmSettle}
        pending={pending}
      />
    </>
  );
}
