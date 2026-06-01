"use client";

import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { buildRecordTradePtb } from "@/lib/ptb";
import { explorerTx } from "@/lib/chain-config";
import type { Oath } from "@/lib/mock";

/**
 * AttestPanel — trade attestation form for the bound exec wallet.
 *
 * Only shown when the connected wallet matches the oath's exec_addr
 * (or promiser as fallback when execAddr is not available from the live read).
 * Signing buildRecordTradePtb populates the equity curve, gauges, and
 * attestation feed.
 *
 * Label copy: "Attestation (bound exec wallet only)" — honest constraint.
 */
export default function AttestPanel({ oath }: { oath: Oath }) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [asset, setAsset] = useState(oath.assets[0] ?? "");
  const [pnlSign, setPnlSign] = useState<"positive" | "negative">("positive");
  const [pnlStr, setPnlStr] = useState("");
  const [equityStr, setEquityStr] = useState("");
  const [notionalStr, setNotionalStr] = useState("");

  const [pending, setPending] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  if (!oath.onchain) return null;

  // Gate: only visible to the bound exec wallet (or promiser as proxy if execAddr unknown)
  const gateAddr = oath.execAddr ?? oath.promiser;
  if (!account) return null;
  // Normalize to lowercase for comparison (avoids zero-padding mismatch)
  if (account.address.toLowerCase() !== gateAddr.toLowerCase()) return null;

  const pnlDelta = Math.trunc(Math.abs(Number.parseFloat(pnlStr) || 0));
  const equityAfter = Math.trunc(Number.parseFloat(equityStr) || 0);
  const notional = Math.trunc(Number.parseFloat(notionalStr) || 0);
  const valid = pnlDelta >= 0 && equityAfter > 0 && notional > 0 && asset.trim().length > 0;

  const handleAttest = () => {
    if (!valid || pending) return;
    setPending(true);
    setTxError(null);
    setTxDigest(null);

    // Synthesize a unique venue tx hash for the demo (Hyperliquid venue path
    // does not verify the hash on-chain for the demo). Prefixed 0x + timestamp hex.
    const venueTxHash = "0x" + Date.now().toString(16).padStart(16, "0");

    const tx = buildRecordTradePtb({
      oathId: oath.oathId,
      venueTxHash,
      asset: asset.trim(),
      pnlDelta: BigInt(pnlDelta),
      pnlNegative: pnlSign === "negative",
      equityAfter: BigInt(equityAfter),
      notional: BigInt(notional),
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await client.waitForTransaction({ digest });
          setTxDigest(digest);
          setPending(false);
          // Refetch oath data so gauges + attestation feed update
          queryClient.invalidateQueries({ queryKey: ["oath", oath.oathId] });
          queryClient.invalidateQueries({ queryKey: ["oaths"] });
          // Reset form
          setPnlStr("");
          setEquityStr("");
          setNotionalStr("");
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          setTxError(msg);
          setPending(false);
        },
      }
    );
  };

  const labelStyle = {
    fontSize: "0.6rem" as const,
    letterSpacing: "0.1em" as const,
    textTransform: "uppercase" as const,
    color: "var(--bone-600)",
    display: "block" as const,
    marginBottom: "0.3rem",
  };
  const inputStyle = {
    width: "100%",
    border: "1px solid var(--bone-200)",
    borderRadius: 6,
    background: "var(--cream)",
    padding: "0.45rem 0.75rem",
    fontSize: "0.875rem",
    color: "var(--bone-950)",
    fontFamily: "var(--font-mono)",
    outline: "none",
  };

  return (
    <section
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 12,
        padding: "1.25rem",
        marginTop: "1.25rem",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--bone-600)",
          }}
        >
          Attestation (bound exec wallet only)
        </span>
        <span
          className="font-mono"
          style={{ fontSize: "0.6rem", color: "var(--bone-600)" }}
        >
          exec: {(oath.execAddr ?? oath.promiser).slice(0, 8)}...
        </span>
      </div>

      <p
        className="font-mono mb-4"
        style={{ fontSize: "0.62rem", color: "var(--bone-600)", lineHeight: 1.55 }}
      >
        Only the bound exec wallet can attest fills. Each attestation updates the
        equity curve, dimension gauges, and the attestation feed.
      </p>

      <div className="flex flex-col gap-3">
        {/* Asset */}
        <div>
          <label className="font-mono" style={labelStyle}>
            Asset
          </label>
          {oath.assets.length > 0 ? (
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              style={{ ...inputStyle }}
            >
              {oath.assets.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="BTC-PERP"
              style={inputStyle}
            />
          )}
        </div>

        {/* PnL delta */}
        <div>
          <label className="font-mono" style={labelStyle}>
            PnL delta (USDC)
          </label>
          <div className="flex gap-2 items-center">
            <div
              className="grid grid-cols-2 gap-0.5 p-0.5 flex-shrink-0"
              style={{ background: "var(--cream-deep)", borderRadius: 6 }}
            >
              {(["positive", "negative"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPnlSign(s)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.7rem",
                    fontFamily: "var(--font-mono)",
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    background: pnlSign === s ? "var(--white)" : "transparent",
                    color:
                      pnlSign === s
                        ? s === "positive"
                          ? "var(--sage-deep)"
                          : "var(--coral-deep)"
                        : "var(--bone-600)",
                    fontWeight: pnlSign === s ? 600 : 400,
                  }}
                >
                  {s === "positive" ? "+" : "-"}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={pnlStr}
              onChange={(e) => setPnlStr(e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, flex: 1, width: "auto" }}
            />
          </div>
        </div>

        {/* Equity after */}
        <div>
          <label className="font-mono" style={labelStyle}>
            Equity after fill (USDC)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={equityStr}
            onChange={(e) => setEquityStr(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>

        {/* Notional */}
        <div>
          <label className="font-mono" style={labelStyle}>
            Notional (USDC)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={notionalStr}
            onChange={(e) => setNotionalStr(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
      </div>

      {txError && (
        <p
          className="font-mono mt-3"
          style={{ fontSize: "0.65rem", color: "var(--coral-deep)" }}
        >
          {txError}
        </p>
      )}
      {txDigest && (
        <p className="font-mono mt-3" style={{ fontSize: "0.65rem", color: "var(--sage-deep)" }}>
          Attested.{" "}
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

      <button
        type="button"
        onClick={handleAttest}
        disabled={!valid || pending}
        className="btn-primary w-full justify-center mt-4"
        style={{
          opacity: !valid || pending ? 0.5 : 1,
          cursor: !valid || pending ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "Attesting..." : "Attest fill"}
      </button>
    </section>
  );
}
