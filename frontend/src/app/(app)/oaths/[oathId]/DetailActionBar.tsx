"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Oath } from "@/lib/mock";
import { fetchOwnedPositions } from "@/lib/chain";
import {
  buildSettlePtb,
  buildMarkBreachPtb,
  buildBelieverClaimPtb,
  buildDoubterClaimPtb,
} from "@/lib/ptb";
import { explorerTx } from "@/lib/chain-config";
import SettleConfirm from "@/components/SettleConfirm";

/**
 * DetailActionBar — sticky bottom action strip for the oath detail screen.
 *
 * "Absent until valid": actions only appear when they can be taken.
 *   Active, equity below floor   -> Mark Breach (permissionless)
 *   Active/resolved, epoch ended -> Settle (permissionless, after modal)
 *   Settled, wallet has position -> Claim Payout
 *
 * All buttons are real on-chain transactions for onchain===true oaths.
 * Mock oaths show a disabled "Demo oath" note.
 */
export default function DetailActionBar({ oath }: { oath: Oath }) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Hydration guard: do NOT compute Date.now() in render (causes SSR mismatch).
  // Gate all time-dependent buttons on this being true.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const oathId = oath.oathId;
  const onchain = !!oath.onchain;

  // Compute gating conditions client-side (after mount to avoid hydration mismatch)
  const now = mounted ? Date.now() : 0;
  const epochEnded = now >= oath.epochEndMs;
  const drawdownFloor = oath.startingEquity * (1 - oath.dims.maxDrawdownBps / 10_000);
  const equityBreached = oath.currentEquity < drawdownFloor;

  const isActive = oath.status === "Active";
  const isResolved = oath.status !== "Active";
  const isSettled = oath.status === "Settled";

  const showMarkBreach = mounted && onchain && isActive && equityBreached;
  const showSettle = mounted && onchain && epochEnded && !isSettled;
  const showClaim = onchain && isSettled && !!account;

  // Fetch the wallet's positions for this oath (only when settled and wallet connected)
  const { data: positions, refetch: refetchPositions } = useQuery({
    queryKey: ["ownedPositions", account?.address ?? ""],
    queryFn: () => fetchOwnedPositions(client, account!.address),
    enabled: !!account && showClaim,
    staleTime: 30_000,
  });

  const myPosition = positions?.find(
    (p) => p.oathId === oathId && !p.claimed
  );

  const hasAction = showMarkBreach || showSettle || (showClaim && !!myPosition);
  if (!hasAction && isResolved && mounted) return null;

  // Refetch helpers
  const invalidateOath = () => {
    queryClient.invalidateQueries({ queryKey: ["oath", oathId] });
    queryClient.invalidateQueries({ queryKey: ["oaths"] });
    queryClient.invalidateQueries({ queryKey: ["sentimentSeries", oathId] });
  };

  const handleMarkBreach = () => {
    if (!account || pending) return;
    setPending(true);
    setTxError(null);
    setTxDigest(null);
    signAndExecute(
      { transaction: buildMarkBreachPtb(oathId) },
      {
        onSuccess: async ({ digest }) => {
          await client.waitForTransaction({ digest });
          setTxDigest(digest);
          setPending(false);
          invalidateOath();
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          const isNotBreached =
            msg.includes("MoveAbort") && msg.includes("12");
          setTxError(
            isNotBreached
              ? "Equity is not below the drawdown floor on-chain."
              : msg
          );
          setPending(false);
        },
      }
    );
  };

  const confirmSettle = () => {
    if (!account || pending) return;
    setPending(true);
    setTxError(null);
    setTxDigest(null);
    signAndExecute(
      { transaction: buildSettlePtb(oathId) },
      {
        onSuccess: async ({ digest }) => {
          await client.waitForTransaction({ digest });
          setTxDigest(digest);
          setPending(false);
          setConfirmOpen(false);
          invalidateOath();
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          const epochNotOver =
            msg.includes("MoveAbort") && msg.includes("5");
          setTxError(
            epochNotOver
              ? "Epoch has not ended yet. Try again after the countdown."
              : msg
          );
          setPending(false);
          setConfirmOpen(false);
        },
      }
    );
  };

  const handleClaim = () => {
    if (!account || !myPosition || pending) return;
    setPending(true);
    setTxError(null);
    setTxDigest(null);
    const tx =
      myPosition.side === "Believer"
        ? buildBelieverClaimPtb(myPosition.positionId, oathId)
        : buildDoubterClaimPtb(myPosition.positionId, oathId);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await client.waitForTransaction({ digest });
          setTxDigest(digest);
          setPending(false);
          refetchPositions();
          invalidateOath();
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          setTxError(msg);
          setPending(false);
        },
      }
    );
  };

  // Determine outcome for the SettleConfirm modal
  const outcome: "Kept" | "Broken" =
    oath.status === "Settled" || oath.status === "Broken"
      ? oath.breachReason
        ? "Broken"
        : "Kept"
      : equityBreached
      ? "Broken"
      : "Kept";

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "var(--cream)",
          borderTop: "1px solid var(--bone-200)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <p
              className="font-mono"
              style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
            >
              {!account
                ? "Connect a wallet to take action."
                : !onchain
                ? "Demo oath — actions are not available."
                : txDigest
                ? "Transaction confirmed."
                : showMarkBreach || showSettle
                ? "Permissionless: anyone can trigger this on-chain."
                : showClaim && myPosition
                ? "Distribution is final and settled on-chain."
                : "No action available yet. Actions appear once valid."}
            </p>
            {txError && (
              <p
                className="font-mono"
                style={{ fontSize: "0.65rem", color: "var(--coral-deep)" }}
              >
                {txError}
              </p>
            )}
            {txDigest && (
              <p className="font-mono" style={{ fontSize: "0.65rem", color: "var(--sage-deep)" }}>
                <a
                  href={explorerTx(txDigest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "underline" }}
                >
                  View tx ↗
                </a>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {!onchain && (
              <span
                className="font-mono"
                style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
              >
                Demo oath
              </span>
            )}

            {showMarkBreach && onchain && (
              <button
                type="button"
                className="btn-secondary"
                disabled={pending || !account}
                style={{
                  color: "var(--coral-deep)",
                  borderColor: "var(--coral-deep)",
                  opacity: pending ? 0.6 : 1,
                  cursor: pending ? "not-allowed" : "pointer",
                }}
                onClick={handleMarkBreach}
              >
                {pending ? "Marking..." : "Mark breach"}
              </button>
            )}

            {showSettle && onchain && (
              <button
                type="button"
                className="btn-primary"
                disabled={pending || !account}
                style={{
                  opacity: pending ? 0.6 : 1,
                  cursor: pending ? "not-allowed" : "pointer",
                }}
                onClick={() => setConfirmOpen(true)}
              >
                {pending ? "Settling..." : "Settle epoch"}
              </button>
            )}

            {showClaim && onchain && myPosition && (
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                style={{
                  opacity: pending ? 0.6 : 1,
                  cursor: pending ? "not-allowed" : "pointer",
                }}
                onClick={handleClaim}
              >
                {pending
                  ? "Claiming..."
                  : `Claim payout (${myPosition.side})`}
              </button>
            )}
          </div>
        </div>
      </div>

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
