"use client";

import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { previewStake } from "@/lib/economics";
import { usdc, bpsToPct } from "@/lib/format";
import { SPLIT } from "@/lib/mock";
import { buildStakeForPtb, buildStakeAgainstPtb } from "@/lib/ptb";
import { explorerTx } from "@/lib/chain-config";

/**
 * StakePanel — Believe / Doubt staking control with a derived payout preview.
 *
 * The preview is computed from the live pool sizes and the 10/20/70 split
 * (see economics.previewStake), NOT a magic multiplier. It shows both branches:
 * what you receive if the oath resolves your way, and that you lose your stake
 * if it resolves the other way.
 *
 * Client component: holds side toggle + amount input state. Wires real
 * transactions via dapp-kit when oathId + onchain are provided.
 */
export default function StakePanel({
  believerPool,
  doubterPool,
  oathId,
  onchain,
  onStake,
  disabled = false,
}: {
  believerPool: number;
  doubterPool: number;
  /** On-chain oath object id. Required for live staking. */
  oathId?: string;
  /** True when this oath exists on testnet and staking is enabled. */
  onchain?: boolean;
  /** Optional callback after a successful stake. */
  onStake?: (side: "Believer" | "Doubter", amount: number) => void;
  disabled?: boolean;
}) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute, isPending: stakePending } = useSignAndExecuteTransaction();

  const [side, setSide] = useState<"Believer" | "Doubter">("Believer");
  const [amountStr, setAmountStr] = useState("");
  const [stakeDigest, setStakeDigest] = useState<string | null>(null);
  const [stakeError, setStakeError] = useState<string | null>(null);

  const amount = Math.trunc(Number.parseFloat(amountStr) || 0);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const preview = previewStake(
    side,
    validAmount ? amount : 0,
    believerPool,
    doubterPool,
  );

  const handleStake = () => {
    if (!validAmount || !account || !oathId || !onchain || stakePending) return;
    setStakeError(null);
    setStakeDigest(null);

    const tx =
      side === "Believer"
        ? buildStakeForPtb(oathId, BigInt(amount))
        : buildStakeAgainstPtb(oathId, BigInt(amount));

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await client.waitForTransaction({ digest });
          setStakeDigest(digest);
          onStake?.(side, amount);
          if (oathId) {
            queryClient.invalidateQueries({ queryKey: ["oath", oathId] });
            queryClient.invalidateQueries({ queryKey: ["sentimentSeries", oathId] });
            queryClient.invalidateQueries({ queryKey: ["oaths"] });
          }
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          const hint =
            msg.toLowerCase().includes("usdc") || msg.toLowerCase().includes("coin")
              ? " Need test USDC? Use Get test USDC in the nav."
              : "";
          setStakeError(msg + hint);
        },
      },
    );
  };

  const sideColor = side === "Believer" ? "var(--sage-deep)" : "var(--coral-deep)";
  const oppositeOutcome = side === "Believer" ? "Broken" : "Kept";
  const winOutcome = side === "Believer" ? "Kept" : "Broken";

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 12,
        padding: "1.25rem",
      }}
    >
      {/* Side toggle */}
      <div
        className="grid grid-cols-2 gap-1 p-1 mb-4"
        style={{ background: "var(--cream-deep)", borderRadius: 8 }}
        role="tablist"
        aria-label="Choose a side"
      >
        {(["Believer", "Doubter"] as const).map((s) => {
          const active = side === s;
          const c = s === "Believer" ? "var(--sage-deep)" : "var(--coral-deep)";
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSide(s)}
              className="py-2 rounded-md text-sm font-semibold transition-colors"
              style={{
                background: active ? "var(--white)" : "transparent",
                color: active ? c : "var(--bone-600)",
                boxShadow: active ? "0 1px 3px rgba(26,20,16,0.08)" : "none",
                cursor: "pointer",
                border: "none",
              }}
            >
              {s === "Believer" ? "Believe" : "Doubt"}
            </button>
          );
        })}
      </div>

      {/* Amount input */}
      <label
        className="font-mono block mb-1.5"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--bone-600)",
        }}
      >
        Stake amount
      </label>
      <div
        className="flex items-center mb-4"
        style={{
          border: "1px solid var(--bone-200)",
          borderRadius: 8,
          background: "var(--cream)",
          padding: "0 0.875rem",
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0"
          className="flex-1 bg-transparent font-mono tabular-nums py-2.5 outline-none"
          style={{ fontSize: "1.05rem", color: "var(--bone-950)", border: "none" }}
          aria-label="Stake amount in USDC"
        />
        <span
          className="font-mono"
          style={{ fontSize: "0.7rem", color: "var(--bone-600)", letterSpacing: "0.08em" }}
        >
          USDC
        </span>
      </div>

      {/* Derived payout preview — both branches */}
      <div
        className="space-y-2.5 mb-4 px-3.5 py-3"
        style={{ background: "var(--cream-deep)", borderRadius: 8 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--bone-600)" }}>
            If <span style={{ color: sideColor, fontWeight: 600 }}>{winOutcome}</span> you receive
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--sage-deep)" }}
          >
            {validAmount ? usdc(preview.ifWin) : "0.00"}{" "}
            <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--bone-600)" }}>
              USDC
            </span>
          </span>
        </div>
        {validAmount && (
          <div
            className="font-mono text-right"
            style={{ fontSize: "0.65rem", color: "var(--bone-600)", marginTop: "-0.375rem" }}
          >
            +{usdc(preview.winProfit)} profit over stake
          </div>
        )}
        <div
          className="flex items-center justify-between"
          style={{ borderTop: "1px solid var(--bone-200)", paddingTop: "0.625rem" }}
        >
          <span className="text-sm" style={{ color: "var(--bone-600)" }}>
            If {oppositeOutcome} you lose
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--coral-deep)" }}
          >
            {validAmount ? usdc(preview.ifLose) : "0.00"}{" "}
            <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--bone-600)" }}>
              USDC
            </span>
          </span>
        </div>
      </div>

      <p
        className="font-mono mb-4"
        style={{ fontSize: "0.625rem", color: "var(--bone-600)", lineHeight: 1.5 }}
      >
        Payout is pro-rata across winners from the losing pool, after a{" "}
        {bpsToPct(SPLIT.platformBps)} platform fee and{" "}
        {bpsToPct(SPLIT.secondaryBps)} to the secondary beneficiary. Not a fixed
        multiple.
      </p>

      {stakeError && (
        <p
          className="text-xs mb-3"
          style={{ color: "var(--coral-deep)" }}
        >
          {stakeError}
        </p>
      )}
      {stakeDigest && (
        <p className="font-mono text-xs mb-3" style={{ color: "var(--sage-deep)" }}>
          Staked.{" "}
          <a
            href={explorerTx(stakeDigest)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            View tx ↗
          </a>
        </p>
      )}
      <button
        type="button"
        disabled={disabled || !validAmount || !account || !onchain || stakePending}
        onClick={handleStake}
        className="btn-primary w-full justify-center"
        style={{
          opacity: disabled || !validAmount || !account || !onchain || stakePending ? 0.5 : 1,
          cursor: disabled || !validAmount || !account || !onchain || stakePending ? "not-allowed" : "pointer",
          background: side === "Believer" ? "var(--sage-deep)" : undefined,
        }}
      >
        {!account
          ? "Connect wallet"
          : !onchain
          ? "Demo oath — staking disabled"
          : stakePending
          ? "Staking..."
          : side === "Believer"
          ? "Stake as Believer"
          : "Stake as Doubter"}
      </button>
    </div>
  );
}
