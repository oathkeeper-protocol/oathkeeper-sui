"use client";

/* ────────────────────────────────────────────────────────────────
   Oathkeeper · Mint screen (/mint)
   Single-column form, mobile-first, aggressive defaults.

   Composes shared vocabulary (RoleBadge, DimChips) but the form
   controls themselves are screen-local helpers — a creation form is
   legitimately bespoke and the shared library is built for the
   consumption screens (cards/badges/gauges/feeds). No new shared
   components are invented here; everything decorative lives below.
   ──────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";

import RoleBadge from "@/components/RoleBadge";
import DimChips from "@/components/DimChips";
import { SPLIT, type OathTypeVariant, type OathDims } from "@/lib/mock";
import { usdc, bpsToPct, addr } from "@/lib/format";
import { buildMintOathPtb, type MintArgs } from "@/lib/ptb";
import { CHAIN, explorerObject, explorerTx } from "@/lib/chain-config";

// ─── Static config ───────────────────────────────────────────────

const VERTICALS: {
  key: OathTypeVariant;
  label: string;
  blurb: string;
  status: "live" | "soon";
}[] = [
  { key: "TradingOath", label: "Trading", blurb: "DeepBook / Hyperliquid fills", status: "live" },
  // Uptime/Behavior have no attestation adapter shipped — enum-only. Marked roadmap so the
  // mint form never lets someone create an un-attestable oath (audit honesty fix).
  { key: "UptimeOath", label: "Uptime", blurb: "HTTPS prober (roadmap)", status: "soon" },
  { key: "BehaviorOath", label: "Behavior", blurb: "Judge attestation (roadmap)", status: "soon" },
  { key: "ValidatorOath", label: "Validator", blurb: "Block production / slashing", status: "soon" },
  { key: "TreasuryOath", label: "Treasury", blurb: "Reserve solvency floor", status: "soon" },
];

const ALL_ASSETS = ["BTC-PERP", "ETH-PERP", "SOL-PERP", "SUI-PERP", "APT-PERP"];

const EPOCHS = [
  { label: "2min (demo)", ms: 120_000 },
  { label: "24h", ms: 86_400_000 },
  { label: "3d", ms: 259_200_000 },
  { label: "7d", ms: 604_800_000 },
  { label: "30d", ms: 2_592_000_000 },
];

// The real PTB: start_epoch (validate + reserve scope) -> bind_exec_wallet (bind + share),
// atomic in one transaction. No Walrus/Seal step yet (that pipeline is wired separately).
const MINT_STEPS = [
  "Validating dimensions",
  "Reserving scope",
  "Binding exec wallet",
  "Sharing oath",
];

export default function MintPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Form state — aggressive, sensible defaults.
  const [vertical, setVertical] = useState<OathTypeVariant>("TradingOath");
  const [oathText, setOathText] = useState("");
  const [clientAddr, setClientAddr] = useState("");
  const [clientClaimStr, setClientClaimStr] = useState("");
  const [dd, setDd] = useState(20); // max drawdown, %
  const [minTrades, setMinTrades] = useState(10);
  const [pnl, setPnl] = useState(5); // min PnL, %
  const [volume, setVolume] = useState(0); // min volume, USDC
  const [venue, setVenue] = useState<"DeepBook" | "Hyperliquid">("DeepBook");
  const [assets, setAssets] = useState<string[]>(["BTC-PERP", "ETH-PERP"]);
  const [epoch, setEpoch] = useState("7d");
  const [bondStr, setBondStr] = useState("");

  // Mint flow.
  const [minting, setMinting] = useState(false);
  const [mintStep, setMintStep] = useState(-1);
  const [mintedOathId, setMintedOathId] = useState<string | null>(null);
  const [mintDigest, setMintDigest] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  // USDC balance for the bond box.
  const { data: balanceData } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address as string, coinType: `${CHAIN.packageId}::usdc::USDC` },
    { enabled: !!account },
  );
  const liveBalance = balanceData ? Number(balanceData.totalBalance) : null;

  const isTrading = vertical === "TradingOath";

  // Derived numbers — whole integers only (BigInt cannot handle decimals).
  const bond = Math.trunc(Number.parseFloat(bondStr) || 0);
  const clientClaim = Math.trunc(Number.parseFloat(clientClaimStr) || 0);

  // Live oath-tuple preview, decoded into on-chain units for DimChips.
  const dims: OathDims = useMemo(
    () => ({
      maxDrawdownBps: Math.round(dd * 100),
      minTrades,
      minPnlBps: Math.round(pnl * 100),
      minVolumeUsdc: volume,
    }),
    [dd, minTrades, pnl, volume],
  );

  // ── Validation (mirrors the contract asserts) ──
  const claimEntered = clientClaimStr.trim() !== "";
  const claimPositive = clientClaim > 0;
  const claimWithinBond = bond > 0 && clientClaim <= bond;
  const claimValid = claimPositive && claimWithinBond;

  const tradesValid = minTrades >= 1; // contract rejects min_trades < 1
  const assetsValid = !isTrading || assets.length >= 1;
  const bondValid = bond > 0;
  // Require a valid 0x Sui address: 0x + 64 hex chars.
  const claimAddrValid = /^0x[0-9a-fA-F]{64}$/.test(clientAddr.trim());

  const formValid =
    bondValid &&
    claimValid &&
    tradesValid &&
    assetsValid &&
    claimAddrValid;

  // Inline error for the claim field.
  const claimError =
    claimEntered && !claimPositive
      ? "Claim must be greater than 0."
      : claimEntered && bond > 0 && !claimWithinBond
        ? "Claim cannot exceed the bond."
        : claimEntered && bond === 0
          ? "Set a bond first."
          : null;

  // Inline error for the client address field.
  const addrError =
    clientAddr.trim().length > 0 && !claimAddrValid
      ? "Must be a full 0x Sui address (66 chars)."
      : null;

  const toggleAsset = (a: string) =>
    setAssets((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  const epochMs = EPOCHS.find((e) => e.label === epoch)?.ms ?? EPOCHS[2].ms;

  const startMint = () => {
    if (!formValid || !account) return;
    setMinting(true);
    setMintStep(0);
    setMintError(null);

    const args: MintArgs = {
      maxDrawdownBps: dims.maxDrawdownBps,
      minTrades: dims.minTrades,
      minPnlBps: dims.minPnlBps,
      minVolumeUsdc: dims.minVolumeUsdc,
      execAddr: account.address,
      venue: 1, // Hyperliquid pass-through (no real sig needed on testnet)
      allowedAssets: isTrading ? assets : [],
      epochDurationMs: epochMs,
      bond: BigInt(bond),
      client: clientAddr.trim(),
      clientClaim: BigInt(clientClaim),
      sealedRoot: oathText.trim() || "Oathkeeper testnet oath",
      bindingNonce: BigInt(Date.now()),
      startingEquityUsdc: BigInt(100_000),
    };

    const tx = buildMintOathPtb(args);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          setMintStep(MINT_STEPS.length - 1);
          try {
            const res = await client.waitForTransaction({
              digest,
              options: { showEvents: true, showEffects: true },
            });
            const ev = res.events?.find((e) =>
              e.type.endsWith("::oath::OathMinted"),
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oathId = (ev?.parsedJson as any)?.oath_id as string | undefined;
            setMintedOathId(oathId ?? null);
            setMintDigest(digest);
          } catch {
            setMintDigest(digest);
          }
        },
        onError: (err) => {
          setMinting(false);
          setMintStep(-1);
          const msg = err instanceof Error ? err.message : String(err);
          const hint = msg.toLowerCase().includes("usdc") || msg.toLowerCase().includes("coin")
            ? " Need test USDC? Use Get test USDC in the nav."
            : "";
          setMintError(msg + hint);
        },
      },
    );
  };

  const done = mintedOathId !== null || mintDigest !== null;

  return (
    <div className="mx-auto max-w-[640px] px-4 sm:px-6 pb-24">
      {/* Header */}
      <header className="pt-10 pb-2">
        <p
          className="font-mono"
          style={{
            fontSize: "0.625rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--gold-ink)",
          }}
        >
          New oath
        </p>
        <h1
          className="mt-3 font-semibold tracking-tight"
          style={{
            fontSize: "2rem",
            color: "var(--bone-950)",
            lineHeight: 1.1,
          }}
        >
          Mint an oath
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--bone-600)", lineHeight: 1.55 }}
        >
          Bond capital against a verifiable commitment. Clients claim against the
          bond; the open market prices your reliability.
        </p>
      </header>

      {/* 1 · Vertical */}
      <Section number="1" label="Vertical">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VERTICALS.map((v) => {
            const active = vertical === v.key;
            const soon = v.status === "soon";
            return (
              <button
                key={v.key}
                type="button"
                disabled={soon}
                aria-pressed={active}
                onClick={() => !soon && setVertical(v.key)}
                className="text-left rounded-md px-3 py-2.5 transition-colors"
                style={{
                  background: active ? "var(--white)" : "transparent",
                  boxShadow: `inset 0 0 0 1px ${
                    active ? "var(--coral-deep)" : "var(--bone-200)"
                  }`,
                  cursor: soon ? "default" : "pointer",
                  opacity: soon ? 0.55 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: active ? "var(--bone-950)" : "var(--bone-800)" }}
                  >
                    {v.label}
                  </span>
                  {soon && (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: "0.55rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                        color: "var(--bone-600)",
                        border: "1px solid var(--bone-200)",
                        borderRadius: 3,
                        padding: "1px 5px",
                      }}
                    >
                      Soon
                    </span>
                  )}
                </div>
                <span
                  className="font-mono block mt-1"
                  style={{ fontSize: "0.625rem", color: "var(--bone-600)" }}
                >
                  {v.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 2 · Oath text */}
      <Section number="2" label="Oath text (sealed)">
        <div
          className="rounded-md overflow-hidden"
          style={{ border: "1px solid var(--bone-200)", background: "var(--white)" }}
        >
          <textarea
            value={oathText}
            onChange={(e) => setOathText(e.target.value.slice(0, 280))}
            rows={3}
            maxLength={280}
            placeholder="I commit to holding drawdown under 20% across at least 10 trades this epoch."
            className="w-full p-3 bg-transparent resize-none outline-none text-sm"
            style={{ color: "var(--bone-950)", lineHeight: 1.55 }}
            aria-label="Oath text"
          />
          <div
            className="px-3 pb-2 text-right font-mono tabular-nums"
            style={{ fontSize: "0.625rem", color: "var(--bone-600)" }}
          >
            {oathText.length}/280
          </div>
        </div>
        <p
          className="mt-2 flex items-center gap-2 text-xs"
          style={{ color: "var(--bone-600)" }}
        >
          <LockIcon />
          Committed on-chain as the oath&rsquo;s text reference. Encrypted storage on
          Walrus + Seal (so the method stays private) is on the roadmap.
        </p>
      </Section>

      {/* 3 · Client */}
      <Section number="3" label="Client">
        <div className="flex items-center gap-2 mb-3">
          <RoleBadge role="Client" />
          <span className="text-xs" style={{ color: "var(--bone-600)" }}>
            The counterparty paid from the bond if you break the oath.
          </span>
        </div>

        <FieldLabel>Client address</FieldLabel>
        <div
          className="flex items-center mb-4 rounded-md"
          style={{
            border: "1px solid var(--bone-200)",
            background: "var(--white)",
            padding: "0 0.875rem",
          }}
        >
          <input
            type="text"
            value={clientAddr}
            onChange={(e) => setClientAddr(e.target.value.trim())}
            placeholder="0x…"
            spellCheck={false}
            className="flex-1 bg-transparent font-mono py-2.5 outline-none"
            style={{ fontSize: "0.85rem", color: "var(--bone-950)" }}
            aria-label="Client address"
          />
          {clientAddr.length >= 12 && (
            <span
              className="font-mono"
              style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
            >
              {addr(clientAddr)}
            </span>
          )}
        </div>
        {addrError && (
          <p className="mt-1 text-xs" style={{ color: "var(--coral-deep)" }}>
            {addrError}
          </p>
        )}

        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel inline>Claim against bond</FieldLabel>
          <span className="font-mono" style={{ fontSize: "0.625rem", color: "var(--bone-600)" }}>
            max {usdc(bond)} USDC
          </span>
        </div>
        <div
          className="flex items-center rounded-md"
          style={{
            border: `1px solid ${claimError ? "var(--coral)" : "var(--bone-200)"}`,
            background: "var(--white)",
            padding: "0 0.875rem",
          }}
        >
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={clientClaimStr}
            onChange={(e) => setClientClaimStr(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent font-mono tabular-nums py-2.5 outline-none"
            style={{ fontSize: "1rem", color: "var(--bone-950)" }}
            aria-label="Client claim amount in USDC"
            aria-invalid={claimError != null}
          />
          <span
            className="font-mono"
            style={{ fontSize: "0.7rem", color: "var(--bone-600)", letterSpacing: "0.08em" }}
          >
            USDC
          </span>
        </div>
        <p
          className="mt-1.5 text-xs"
          style={{ color: claimError ? "var(--coral-deep)" : "var(--bone-600)" }}
        >
          {claimError ?? "Must be greater than 0 and no more than the bond."}
        </p>
      </Section>

      {/* 4 · Dimensions */}
      <Section number="4" label="Dimensions">
        <Slider
          label="Max drawdown"
          value={dd}
          unit="%"
          min={5}
          max={50}
          step={1}
          onChange={setDd}
        />
        <Slider
          label="Min trades"
          value={minTrades}
          unit=""
          min={1}
          max={100}
          step={1}
          onChange={setMinTrades}
          note="Contract rejects min trades below 1. The fence against dead-oath exploits."
        />
        <Slider
          label="Min PnL"
          value={pnl}
          unit="%"
          min={0}
          max={50}
          step={1}
          onChange={setPnl}
        />
        <Slider
          label="Min volume"
          value={volume}
          unit=" USDC"
          min={0}
          max={500_000}
          step={5_000}
          onChange={setVolume}
          format={usdc}
        />
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--bone-200)" }}>
          <FieldLabel>Oath tuple</FieldLabel>
          <div className="mt-1.5">
            <DimChips dims={dims} />
          </div>
        </div>
      </Section>

      {/* 5 · Scope */}
      <Section number="5" label="Scope">
        {isTrading ? (
          <>
            <FieldLabel>Venue</FieldLabel>
            <div className="flex gap-2 mb-2">
              {(["DeepBook", "Hyperliquid"] as const).map((v) => {
                const active = venue === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setVenue(v)}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    style={{
                      color: active ? "var(--bone-950)" : "var(--bone-600)",
                      background: active ? "var(--white)" : "transparent",
                      boxShadow: `inset 0 0 0 1px ${
                        active ? "var(--coral-deep)" : "var(--bone-200)"
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <p className="font-mono mb-4" style={{ fontSize: "0.6rem", color: "var(--bone-600)" }}>
              Browser mint currently creates SELF_REPORTED oaths. WITNESSED DeepBook oaths
              are the capture-at-execution path: fills route through the contract, and final
              settlement needs the bound BalanceManager anchor.
            </p>

            <FieldLabel>Allowed assets</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {ALL_ASSETS.map((a) => {
                const active = assets.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleAsset(a)}
                    className="px-3 py-1.5 rounded-md font-mono transition-colors"
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: active ? "var(--bone-950)" : "var(--bone-600)",
                      background: active ? "var(--white)" : "transparent",
                      boxShadow: `inset 0 0 0 1px ${
                        active ? "var(--bone-400)" : "var(--bone-200)"
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            {!assetsValid && (
              <p className="text-xs" style={{ color: "var(--coral-deep)" }}>
                Select at least one asset.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm mb-4" style={{ color: "var(--bone-600)" }}>
            {vertical === "UptimeOath"
              ? "Scope is the monitored endpoint, bound at start. No trading venue or asset set."
              : "Scope is the evaluation window, bound at start. No trading venue or asset set."}
          </p>
        )}

        <div className={isTrading ? "mt-4" : ""}>
          <FieldLabel>Epoch duration</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {EPOCHS.map((e) => {
              const active = epoch === e.label;
              return (
                <button
                  key={e.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setEpoch(e.label)}
                  className="px-3.5 py-1.5 rounded-md font-mono transition-colors"
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: active ? "var(--bone-950)" : "var(--bone-600)",
                    background: active ? "var(--white)" : "transparent",
                    boxShadow: `inset 0 0 0 1px ${
                      active ? "var(--coral-deep)" : "var(--bone-200)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 6 · Bond */}
      <Section number="6" label="Bond">
        <div className="flex items-center gap-2 mb-3">
          <RoleBadge role="Oathkeeper" />
          <span className="text-xs" style={{ color: "var(--bone-600)" }}>
            Your principal at risk. Returned in full if the oath holds.
          </span>
        </div>
        <div
          className="rounded-md overflow-hidden"
          style={{ border: "1px solid var(--bone-200)", background: "var(--white)" }}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={bondStr}
              onChange={(e) => setBondStr(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent font-mono tabular-nums outline-none"
              style={{ fontSize: "1.4rem", fontWeight: 600, color: "var(--bone-950)" }}
              aria-label="Bond amount in USDC"
            />
            <span
              className="font-mono"
              style={{ fontSize: "0.7rem", color: "var(--bone-600)", letterSpacing: "0.08em" }}
            >
              USDC
            </span>
          </div>
          <div className="flex gap-2 px-4 pb-3">
            {["100", "1000", "10000"].map((q) => (
              <QuickChip key={q} onClick={() => setBondStr(q)}>
                {usdc(Number(q))}
              </QuickChip>
            ))}
            {liveBalance !== null && (
              <QuickChip onClick={() => setBondStr(String(liveBalance))}>max</QuickChip>
            )}
          </div>
        </div>

        {/* Economics — premium framed as the secondary share of attracted doubt */}
        <div
          className="mt-3 flex flex-col gap-2 px-3.5 py-3 font-mono"
          style={{
            fontSize: "0.75rem",
            background: "var(--cream-deep)",
            borderRadius: 8,
          }}
        >
          <Row>
            <span style={{ color: "var(--bone-600)" }}>Balance</span>
            <span className="tabular-nums" style={{ color: "var(--bone-800)" }}>
              {liveBalance !== null ? `${usdc(liveBalance)} USDC` : account ? "loading..." : "connect wallet"}
            </span>
          </Row>
          <Row>
            <span style={{ color: "var(--bone-600)" }}>Your premium if Kept</span>
            <span style={{ color: "var(--sage-deep)", fontWeight: 600 }}>
              {bpsToPct(SPLIT.secondaryBps)} of Doubter stakes attracted
            </span>
          </Row>
          <Row>
            <span style={{ color: "var(--bone-600)" }}>Paid to Client if Broken</span>
            <span className="tabular-nums" style={{ color: "var(--coral-deep)", fontWeight: 600 }}>
              up to {usdc(claimValid ? clientClaim : 0)} USDC
            </span>
          </Row>
        </div>
        <p
          className="mt-2 font-mono"
          style={{ fontSize: "0.625rem", color: "var(--bone-600)", lineHeight: 1.5 }}
        >
          The premium is not a fixed bond multiple; it scales with the Doubter
          stakes your oath attracts. The Platform takes{" "}
          {bpsToPct(SPLIT.platformBps)} of the losing pool on every settlement.
        </p>
      </Section>

      {/* CTA / progress strip */}
      {mintError && (
        <div
          className="mt-6 px-4 py-3 rounded-md text-sm"
          style={{ background: "var(--coral-pale, #fef2f2)", color: "var(--coral-deep)", border: "1px solid var(--coral)" }}
        >
          {mintError}
        </div>
      )}
      {!minting ? (
        <button
          type="button"
          onClick={startMint}
          disabled={!formValid || !account}
          className="btn-primary w-full justify-center mt-8"
          style={{
            padding: "0.9rem 1.5rem",
            fontSize: "0.95rem",
            opacity: formValid && account ? 1 : 0.5,
            cursor: formValid && account ? "pointer" : "not-allowed",
          }}
        >
          {!account ? "Connect wallet to mint" : "Mint oath"}
          <span className="font-mono" aria-hidden="true">
            →
          </span>
        </button>
      ) : (
        <div
          className="mt-8 rounded-lg px-5 py-5"
          style={{ background: "var(--white)", border: "1px solid var(--bone-200)" }}
        >
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            {MINT_STEPS.map((step, i) => {
              const state =
                i < mintStep ? "done" : i === mintStep ? "active" : "pending";
              return (
                <li key={step} className="flex items-center gap-2">
                  <StepDot state={state} />
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "0.66rem",
                      letterSpacing: "0.02em",
                      color:
                        state === "pending" ? "var(--bone-600)" : "var(--bone-800)",
                      fontWeight: state === "active" ? 600 : 400,
                    }}
                  >
                    {step}
                  </span>
                  {i < MINT_STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="font-mono"
                      style={{ color: "var(--bone-300)", fontSize: "0.66rem" }}
                    >
                      →
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {done && (
            <div
              className="mt-4 pt-4"
              style={{ borderTop: "1px solid var(--bone-200)" }}
            >
              <p
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--sage-deep)" }}
              >
                Oath minted and shared.
              </p>
              <div className="flex flex-col gap-2 font-mono" style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}>
                {mintedOathId && (
                  <span>
                    Oath:{" "}
                    <a
                      href={explorerObject(mintedOathId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--sage-deep)", textDecoration: "underline" }}
                    >
                      {mintedOathId.slice(0, 10)}...{mintedOathId.slice(-6)} ↗
                    </a>
                  </span>
                )}
                {mintDigest && (
                  <span>
                    Tx:{" "}
                    <a
                      href={explorerTx(mintDigest)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--sage-deep)", textDecoration: "underline" }}
                    >
                      {mintDigest.slice(0, 10)}...{mintDigest.slice(-6)} ↗
                    </a>
                  </span>
                )}
              </div>
              <div className="flex gap-3 mt-4 flex-wrap">
                {mintedOathId && (
                  <Link
                    href={`/oaths/${mintedOathId}`}
                    className="btn-primary"
                    style={{ fontSize: "0.85rem" }}
                  >
                    View oath →
                  </Link>
                )}
                <Link
                  href="/oaths"
                  className="btn-secondary"
                  style={{ fontSize: "0.85rem" }}
                >
                  Browse market →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {account ? (
        <p
          className="mt-4 text-center font-mono"
          style={{ fontSize: "0.625rem", color: "var(--bone-600)" }}
        >
          Exec wallet bound to {addr(account.address)} at start.
        </p>
      ) : (
        <p
          className="mt-4 text-center text-xs"
          style={{ color: "var(--bone-600)" }}
        >
          Connect a wallet to bind it as the oath&rsquo;s exec wallet.
        </p>
      )}
    </div>
  );
}

function Section({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <div className="flex items-center gap-2.5 mb-3.5">
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--coral-deep)" }}
        >
          {number}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: "0.625rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--bone-600)",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  children,
  inline = false,
}: {
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <span
      className={`font-mono ${inline ? "" : "block mb-1.5"}`}
      style={{
        fontSize: "0.6rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--bone-600)",
      }}
    >
      {children}
    </span>
  );
}

function Slider({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  note,
  format,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  note?: string;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : value;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm" style={{ color: "var(--bone-800)" }}>
          {label}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--bone-950)" }}
        >
          {display}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          height: 4,
          borderRadius: 999,
          appearance: "none",
          WebkitAppearance: "none",
          outline: "none",
          accentColor: "var(--coral)",
          background: `linear-gradient(to right, var(--sage-deep) ${pct}%, var(--bone-200) ${pct}%)`,
          cursor: "pointer",
        }}
        aria-label={label}
      />
      {note && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--bone-600)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function QuickChip({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-md font-mono transition-colors"
      style={{
        fontSize: "0.66rem",
        fontWeight: 600,
        color: "var(--bone-600)",
        boxShadow: "inset 0 0 0 1px var(--bone-200)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between">{children}</div>;
}

function StepDot({ state }: { state: "done" | "active" | "pending" }) {
  const bg =
    state === "done"
      ? "var(--sage-deep)"
      : state === "active"
        ? "var(--coral)"
        : "transparent";
  return (
    <span
      aria-hidden="true"
      style={{
        width: 9,
        height: 9,
        borderRadius: 999,
        background: bg,
        boxShadow: state === "pending" ? "inset 0 0 0 1px var(--bone-300)" : "none",
        flexShrink: 0,
      }}
    />
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
