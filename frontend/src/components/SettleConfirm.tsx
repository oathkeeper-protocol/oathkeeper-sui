"use client";

import { useEffect, useRef } from "react";
import type { Oath } from "@/lib/mock";
import FlowDiagram from "./FlowDiagram";

/**
 * SettleConfirm — confirmation modal for the final, irreversible Settle action.
 *
 * A modal is justified here precisely because settlement is irreversible: it
 * distributes the bond and both pools on-chain in a single transaction with no
 * dispute window. This is the one flow in the app that warrants interrupting
 * the user. (The preview itself stays inline; see SettlePreview.)
 *
 * Client component: dialog open/close, escape-to-close, focus management.
 * Renders nothing when `open` is false.
 */
export default function SettleConfirm({
  oath,
  outcome,
  open,
  onClose,
  onConfirm,
  pending = false,
}: {
  oath: Oath;
  outcome: "Kept" | "Broken";
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** True while the settle transaction is in flight. */
  pending?: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(26,20,16,0.45)" }}
      onClick={() => !pending && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm settlement"
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: "var(--white)",
          border: "1px solid var(--bone-200)",
          borderRadius: 14,
          boxShadow: "0 24px 60px -16px rgba(26,20,16,0.30)",
          padding: "1.5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="font-bold mb-1"
          style={{ fontSize: "1.15rem", color: "var(--bone-950)" }}
        >
          Settle oath {oath.oathId}
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--bone-600)" }}>
          Settlement is final and runs on-chain in one transaction. There is no
          dispute window and it cannot be reversed. Confirm the distribution
          below.
        </p>

        <FlowDiagram
          outcome={outcome}
          bondAmount={oath.bondAmount}
          clientClaim={oath.clientClaim}
          believerPool={oath.totalBelieverStakes}
          doubterPool={oath.totalDoubterStakes}
        />

        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={pending}
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={pending}
            style={{ opacity: pending ? 0.6 : 1, cursor: pending ? "wait" : "pointer" }}
          >
            {pending ? "Settling…" : "Confirm settlement"}
          </button>
        </div>
      </div>
    </div>
  );
}
