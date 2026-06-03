"use client";

import Link from "next/link";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { fetchOath } from "@/lib/chain";
import { usdc } from "@/lib/format";
import type { Oath } from "@/lib/mock";

import DimGauge from "@/components/DimGauge";
import ProgressGauge from "@/components/ProgressGauge";
import DimChips from "@/components/DimChips";
import SentimentBar from "@/components/SentimentBar";
import AttestationFeed from "@/components/AttestationFeed";
import RoleBadge from "@/components/RoleBadge";
import StakePanel from "@/components/StakePanel";
import SettlePreview from "@/components/SettlePreview";
import AttestPanel from "@/components/AttestPanel";
import LiveAttestations from "./LiveAttestations";
import LiveSentiment from "./LiveSentiment";
import DetailActionBar from "./DetailActionBar";

// The mock view-model is anchored to a fixed NOW for deterministic rendering of
// relative times inside AttestationFeed when not on-chain.
const MOCK_NOW = Date.UTC(2026, 4, 31, 14, 0, 0);

/** Synthetic Walrus blob id, deterministically derived from the oath id. */
function walrusBlobFor(oathId: string): string {
  const seed = oathId.replace(/^0x/, "");
  const hash = seed
    .split("")
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    .toString(16)
    .padStart(6, "0")
    .slice(-4);
  return `0x${seed.padStart(4, "0").slice(-4)}...${hash}`;
}

/** Equity floor implied by the drawdown dimension, in USDC terms. */
function drawdownFloor(oath: Oath): number {
  return oath.startingEquity * (1 - oath.dims.maxDrawdownBps / 10_000);
}

/** Current drawdown from start, in basis points (>= 0 when below start). */
function currentDrawdownBps(oath: Oath): number {
  if (oath.startingEquity <= 0) return 0;
  const drop = (oath.startingEquity - oath.currentEquity) / oath.startingEquity;
  return Math.max(0, Math.round(drop * 10_000));
}

/** Net PnL this epoch, in basis points (can be negative). */
function currentPnlBps(oath: Oath): number {
  if (oath.startingEquity <= 0) return 0;
  const ret = (oath.currentEquity - oath.startingEquity) / oath.startingEquity;
  return Math.round(ret * 10_000);
}

/**
 * LiveOathView — the single client island for an oath detail page.
 *
 * Owns the live fetchOath query and renders all market-state, gauges,
 * attestation feed, stake/settle panel, and action bar from one source.
 * The server page renders only the static chrome (breadcrumb, title strip)
 * from the snapshot `fallback`.
 *
 * For a fresh oath (unknown id, fallback=null), this component is the
 * entire body. For a known-snapshot oath, it replaces the SSR market-state.
 */
export default function LiveOathView({
  oathId,
  fallback,
}: {
  oathId: string;
  fallback: Oath | null;
}) {
  const client = useSuiClient();

  const { data, isLoading } = useQuery({
    queryKey: ["oath", oathId],
    queryFn: () => fetchOath(client, oathId),
    // Only hit the chain if this looks like a real on-chain id (long hex) OR
    // if we have no fallback at all. Mock snapshot ids (e.g. "0x0481") resolve
    // null and should just show the snapshot data.
    enabled: fallback?.onchain !== false,
    initialData: fallback ?? undefined,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  // data === undefined: query is disabled (mock-only) — use fallback
  // data === null: query resolved but no Oath object found (bad id)
  const oath: Oath | null | undefined =
    data !== undefined ? data : fallback;

  // Loading: query is in-flight and no snapshot data at all
  if (isLoading && oath === undefined) {
    return (
      <div
        className="font-mono"
        style={{
          fontSize: "0.82rem",
          color: "var(--bone-600)",
          padding: "2rem 0",
        }}
      >
        Loading oath {oathId.slice(0, 10)}...
      </div>
    );
  }

  // Not found: query resolved null — this id is not an Oath object on-chain
  if (oath === null) {
    return (
      <div style={{ padding: "2rem 0" }}>
        <p
          className="font-mono mb-4"
          style={{ fontSize: "0.9rem", color: "var(--bone-600)" }}
        >
          Oath not found on-chain for id {oathId.slice(0, 10)}...{oathId.slice(-6)}
        </p>
        <Link
          href="/oaths"
          className="btn-secondary font-mono"
          style={{ fontSize: "0.78rem" }}
        >
          Browse oaths
        </Link>
      </div>
    );
  }

  // oath is Oath (from snapshot or live query)
  const o = oath as Oath;

  const resolved = o.status !== "Active";
  const outcome: "Kept" | "Broken" =
    o.status === "Settled"
      ? o.breachReason
        ? "Broken"
        : "Kept"
      : o.status === "Broken"
        ? "Broken"
        : "Kept";

  const ddCurrentPct = currentDrawdownBps(o) / 100;
  const pnlCurrentPct = currentPnlBps(o) / 100;
  const pnlFloorPct = o.dims.minPnlBps / 100;
  const showVolumeGauge = o.dims.minVolumeUsdc > 0;
  const showPnlGauge = o.dims.minPnlBps > 0;

  const believer = o.totalBelieverStakes;
  const doubter = o.totalDoubterStakes;
  const stakedTotal = believer + doubter;

  const sides: { role: "Believer" | "Doubter"; total: number }[] = [
    { role: "Believer", total: believer },
    { role: "Doubter", total: doubter },
  ];

  const walrusBlobId = walrusBlobFor(oathId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT — the commitment */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        {/* Live sentiment chart (on-chain oaths) */}
        {o.onchain && <LiveSentiment oathId={oathId} />}

        {/* Sealed oath text */}
        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--bone-600)",
              }}
            >
              The oath · {o.oathType.replace("Oath", "")}
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-mono"
              style={{ fontSize: "0.65rem", color: "var(--steel-deep)" }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="2.25"
                  y="5.25"
                  width="7.5"
                  height="5"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.1"
                />
                <path
                  d="M4 5.25V4a2 2 0 0 1 4 0v1.25"
                  stroke="currentColor"
                  strokeWidth="1.1"
                />
              </svg>
              Sealed
            </span>
          </div>
          <p
            className="leading-relaxed mb-4"
            style={{ fontSize: "0.95rem", color: "var(--bone-950)" }}
          >
            {o.clientClaimText}
          </p>
          <div
            className="flex items-center justify-between gap-3 pt-3"
            style={{ borderTop: "1px solid var(--bone-200)" }}
          >
            <span
              className="font-mono"
              style={{ fontSize: "0.62rem", color: "var(--bone-600)" }}
            >
              The oath&rsquo;s text reference is committed on-chain. Encrypted Walrus +
              Seal storage (so the method stays private) is on the roadmap.
            </span>
            <span
              className="font-mono whitespace-nowrap"
              style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
              title={`On-chain text reference (sealed_oath_text_root preview): ${walrusBlobId}`}
            >
              ref {walrusBlobId}
            </span>
          </div>
        </section>

        {/* Dimensions */}
        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            padding: "1.25rem",
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
              Dimensions · all must hold
            </span>
            <DimChips dims={o.dims} />
          </div>
          <div className="flex flex-col gap-4">
            <DimGauge
              label="Max drawdown"
              current={ddCurrentPct}
              floor={o.dims.maxDrawdownBps / 100}
              inverted
              formatValue={(v) => `${Math.round(v * 10) / 10}%`}
            />
            <ProgressGauge
              label="Trades recorded"
              current={o.tradeCount}
              target={o.dims.minTrades}
            />
            {showPnlGauge && (
              <DimGauge
                label="Net return"
                current={pnlCurrentPct}
                floor={pnlFloorPct}
                formatValue={(v) =>
                  `${v >= 0 ? "+" : ""}${Math.round(v * 10) / 10}%`
                }
              />
            )}
            {showVolumeGauge && (
              <DimGauge
                label="Traded volume"
                current={o.cumulativeVolume}
                floor={o.dims.minVolumeUsdc}
                unit=""
                formatValue={(v) => `${usdc(v)} USDC`}
              />
            )}
          </div>
        </section>

        {/* Bond + client claim */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 gap-px"
          style={{
            background: "var(--bone-200)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ background: "var(--white)", padding: "1.25rem" }}>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono"
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--bone-600)",
                }}
              >
                Bond at risk
              </span>
              <RoleBadge role="Oathkeeper" size="xs" />
            </div>
            <div
              className="font-mono tabular-nums"
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "var(--bone-950)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {usdc(o.bondAmount)}{" "}
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: "var(--bone-600)",
                  letterSpacing: "0.08em",
                }}
              >
                USDC
              </span>
            </div>
          </div>
          <div style={{ background: "var(--white)", padding: "1.25rem" }}>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono"
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--bone-600)",
                }}
              >
                Client claim
              </span>
              <RoleBadge role="Client" size="xs" />
            </div>
            <div
              className="font-mono tabular-nums"
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "var(--bone-950)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {usdc(o.clientClaim)}{" "}
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: "var(--bone-600)",
                  letterSpacing: "0.08em",
                }}
              >
                USDC
              </span>
            </div>
            <div
              className="font-mono mt-1"
              style={{ fontSize: "0.62rem", color: "var(--bone-600)" }}
            >
              against bond if broken · {o.client.slice(0, 8)}...
            </div>
          </div>
        </section>

        {/* Market sentiment */}
        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <span
            className="font-mono block mb-3"
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--bone-600)",
            }}
          >
            Market: capital staked each way
          </span>
          <SentimentBar
            believerTotal={believer}
            doubterTotal={doubter}
            height={10}
          />
        </section>

        {/* Verification — the open-source reconciler */}
        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--bone-600)",
              }}
            >
              Verification · reconciliation
            </span>
            {o.disputeCount && o.disputeCount > 0 ? (
              <span
                className="font-mono"
                style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--coral-deep)" }}
              >
                ⚠ {o.disputeCount} dispute{o.disputeCount === 1 ? "" : "s"} filed
              </span>
            ) : (
              <span
                className="font-mono"
                style={{ fontSize: "0.62rem", color: "var(--bone-600)" }}
              >
                no disputes filed
              </span>
            )}
          </div>
          {(() => {
            const witnessed = (o.verifiabilityTier ?? "SELF_REPORTED") === "WITNESSED";
            return (
              <div
                className="inline-flex items-center gap-2 mb-3 font-mono"
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: witnessed ? "var(--sage-deep)" : "var(--bone-600)",
                  background: witnessed ? "var(--cream-deep)" : "transparent",
                  border: `1px solid ${witnessed ? "var(--sage-deep)" : "var(--bone-200)"}`,
                  borderRadius: 6,
                  padding: "0.25rem 0.5rem",
                }}
                title={
                  witnessed
                    ? "DeepBook capture-at-execution: dimensions derived from on-chain fills + balance(). Drawdown-survival is trustless; other dims are witnessed (not wash-proof)."
                    : "Operator self-reports fills via record_trade. The reconciler can flag fabrications (DISPUTABLE), but settlement trusts the inputs."
                }
              >
                {witnessed ? "WITNESSED · DeepBook" : "SELF-REPORTED · disputable"}
              </div>
            );
          })()}
          <p
            className="leading-relaxed mb-3"
            style={{ fontSize: "0.82rem", color: "var(--bone-800)" }}
          >
            Settlement enforces the dimensions on-chain. An open-source, deterministic
            reconciler independently diffs the operator&rsquo;s attestations against the
            venue&rsquo;s own fill record — a fabricated fill is provable by anyone, who can
            then file <span className="font-mono">dispute_attestation</span> on-chain.
          </p>
          <div
            className="font-mono"
            style={{
              fontSize: "0.7rem",
              color: "var(--bone-800)",
              background: "var(--cream-deep)",
              borderRadius: 6,
              padding: "0.55rem 0.7rem",
              overflowX: "auto",
            }}
          >
            pnpm reconcile {oathId.slice(0, 10)}…
          </div>
          <p
            className="font-mono mt-2"
            style={{ fontSize: "0.6rem", color: "var(--bone-600)", lineHeight: 1.5 }}
          >
            Trustless for on-chain venues (DeepBook — the chain is the oracle). Off-chain
            venues (Hyperliquid, uptime) resolve via Nautilus / zkTLS attestation — roadmap.
            Auto-slash on a proven dispute is the bonded-optimistic layer.
          </p>
        </section>
      </div>

      {/* RIGHT — the market */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Stake / settlement preview */}
        {resolved ? (
          <SettlePreview oath={o} outcome={outcome} />
        ) : (
          <div>
            <span
              className="font-mono block mb-2"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--bone-600)",
              }}
            >
              Take a side
            </span>
            <StakePanel
              believerPool={believer}
              doubterPool={doubter}
              oathId={oathId}
              onchain={o.onchain}
            />
          </div>
        )}

        {/* Attestation feed */}
        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--bone-600)",
              }}
            >
              Attestation feed
            </span>
            <span
              className="font-mono"
              style={{ fontSize: "0.6rem", color: "var(--bone-600)" }}
            >
              {resolved ? "archived" : "live"}
            </span>
          </div>
          {o.onchain ? (
            <LiveAttestations oathId={oathId} />
          ) : (
            <AttestationFeed rows={o.attestations} now={MOCK_NOW} />
          )}
        </section>

        {/* Attestation panel (exec wallet only) */}
        <AttestPanel oath={o} />

        {/* Stakers */}
        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--bone-600)",
              }}
            >
              Stakers
            </span>
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: "0.6rem", color: "var(--bone-600)" }}
            >
              {usdc(stakedTotal)} USDC staked
            </span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sides.map((s, i) => {
              const sharePct =
                stakedTotal > 0
                  ? Math.round((s.total / stakedTotal) * 100)
                  : 0;
              return (
                <li
                  key={s.role}
                  className="flex items-center justify-between py-2.5"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--bone-200)",
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <RoleBadge role={s.role} size="xs" />
                    <span
                      className="font-mono tabular-nums"
                      style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
                    >
                      {sharePct}% of pool
                    </span>
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--bone-950)",
                    }}
                  >
                    {usdc(s.total)}{" "}
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 500,
                        color: "var(--bone-600)",
                      }}
                    >
                      USDC
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Sticky action bar */}
      <DetailActionBar oath={o} />
    </div>
  );
}
