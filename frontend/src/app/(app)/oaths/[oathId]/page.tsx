import Link from "next/link";
import type { Oath } from "@/lib/mock";
import { OATHS, getOath } from "@/lib/mock";
import { usdc, addr } from "@/lib/format";

import StandingBadge from "@/components/StandingBadge";
import StatusBadge from "@/components/StatusBadge";
import Countdown from "@/components/Countdown";
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

import DetailActionBar from "./DetailActionBar";
import LiveSentiment from "./LiveSentiment";
import LiveDetail from "./LiveDetail";

/**
 * Oath detail — /oaths/[oathId]
 *
 * The single deep view of one commitment. Two columns on desktop, stacked on
 * mobile. Left = the commitment (who, what was sworn, are they on track, what's
 * bonded). Right = the market (stake, the live tape, who else is in). A sticky
 * action bar surfaces Mark Breach / Settle only when each is actually valid
 * (DESIGN.md "Absent until valid").
 *
 * Server Component: all the presentational composition is static. The only
 * interactive parts are isolated client atoms — StakePanel (its own state) and
 * DetailActionBar (the settle/claim flow + modal). The route is mock-routed, so
 * an unknown id falls back to the first live oath rather than 404-ing.
 */

// The mock view-model is anchored to a fixed NOW (2026-05-31 14:00 UTC). Use it
// for deterministic SSR of relative times and for gating the settle/breach
// actions, so the page renders identically on server and client.
const NOW = Date.UTC(2026, 4, 31, 14, 0, 0);

/** Prerender every known oath id; unknown ids fall back at request time. */
export function generateStaticParams() {
  return OATHS.map((o) => ({ oathId: o.oathId }));
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

export default async function OathDetailPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited. The generated
  // PageProps<'/oaths/[oathId]'> helper resolves to this once the route types
  // are regenerated at build; the explicit shape keeps the type-check stable
  // regardless of generation order.
  params: Promise<{ oathId: string }>;
}) {
  const { oathId } = await params;
  // Mock-routed: resolve by id, else fall back to the first Active oath so any
  // link renders a complete screen.
  const oath =
    getOath(oathId) ??
    OATHS.find((o) => o.status === "Active") ??
    OATHS[0];

  const resolved = oath.status !== "Active";
  // Outcome derivation (per manifest): breachReason present => Broken, else Kept.
  const outcome: "Kept" | "Broken" =
    oath.status === "Settled"
      ? oath.breachReason
        ? "Broken"
        : "Kept"
      : oath.status === "Broken"
        ? "Broken"
        : "Kept";

  const ddCurrentPct = currentDrawdownBps(oath) / 100;
  const pnlCurrentPct = currentPnlBps(oath) / 100;
  const pnlFloorPct = oath.dims.minPnlBps / 100;

  const showVolumeGauge = oath.dims.minVolumeUsdc > 0;
  const showPnlGauge = oath.dims.minPnlBps > 0;

  // Both market sides as aggregate pools. The mock has no per-staker roster
  // (POSITIONS is the connected user's own portfolio, not this oath's book), so
  // we surface the two pool totals — which reconcile exactly with the
  // SentimentBar above — rather than fabricate individual addresses.
  const sides: { role: "Believer" | "Doubter"; total: number }[] = [
    { role: "Believer", total: oath.totalBelieverStakes },
    { role: "Doubter", total: oath.totalDoubterStakes },
  ];
  const stakedTotal = oath.totalBelieverStakes + oath.totalDoubterStakes;

  // Synthetic Walrus blob id, deterministically derived from the oath id so it
  // is stable across SSR/client and never mistaken for an on-chain address.
  const seed = oath.oathId.replace(/^0x/, "");
  const walrusBlobId = `0x${seed.padStart(4, "0").slice(-4)}…${seed
    .split("")
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    .toString(16)
    .padStart(6, "0")
    .slice(-4)}`;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-6 pb-28">
      {/* Breadcrumb */}
      <nav
        className="font-mono flex items-center gap-2 mb-6"
        style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
        aria-label="Breadcrumb"
      >
        <Link
          href="/oaths"
          className="transition-colors"
          style={{ color: "var(--bone-600)", textDecoration: "none" }}
        >
          Browse oaths
        </Link>
        <span aria-hidden="true">/</span>
        {oath.explorerUrl ? (
          <a
            href={oath.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors"
            style={{ color: "var(--sage-deep)", textDecoration: "none" }}
            title="View this oath on the Sui testnet explorer"
          >
            {oath.oathId.slice(0, 10)}…{oath.oathId.slice(-6)}
            <span style={{ fontSize: "0.7em" }} aria-hidden="true">↗ live</span>
          </a>
        ) : (
          <span style={{ color: "var(--bone-800)" }}>{oath.oathId}</span>
        )}
      </nav>

      {/* Title strip — operator + standing + status + ambient countdown */}
      <header
        className="flex flex-wrap items-start justify-between gap-4 pb-6 mb-6"
        style={{ borderBottom: "1px solid var(--bone-200)" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <h1
              className="font-mono"
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--bone-950)",
                letterSpacing: "-0.01em",
              }}
            >
              {oath.promiserAlias ?? addr(oath.promiser)}
            </h1>
            <RoleBadge role="Oathkeeper" />
            <StatusBadge status={oath.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono"
              style={{ fontSize: "0.72rem", color: "var(--bone-600)" }}
            >
              {addr(oath.promiser)}
            </span>
            <StandingBadge standing={oath.standing} size={9} gap={2} max={14} />
            <span
              className="font-mono"
              style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
            >
              {oath.standing.kept} kept · {oath.standing.broken} broken
            </span>
          </div>
        </div>

        {/* Ambient countdown (static, no pulse) / resolved outcome line */}
        <div className="text-right">
          <div
            className="font-mono"
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--bone-600)",
              marginBottom: "0.25rem",
            }}
          >
            {resolved ? "Epoch closed" : "Settles in"}
          </div>
          {resolved ? (
            <span
              className="font-mono"
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color:
                  outcome === "Broken"
                    ? "var(--coral-deep)"
                    : "var(--sage-deep)",
              }}
            >
              {oath.breachReason ? `Broke on ${oath.breachReason}` : "Oath held"}
            </span>
          ) : (
            <Countdown
              epochEndMs={oath.epochEndMs}
              className="font-mono tabular-nums"
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--gold-deep)",
                letterSpacing: "-0.01em",
              }}
            />
          )}
        </div>
      </header>

      {/* Live pool strip — client overlay for on-chain oaths, shows after first paint */}
      {oath.onchain && <LiveDetail oathId={oath.oathId} fallback={oath} />}

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT — the commitment */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Live sentiment chart — only for on-chain oaths */}
          {oath.onchain && <LiveSentiment oathId={oath.oathId} />}

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
                The oath ·{" "}
                {oath.oathType.replace("Oath", "")}
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
              {oath.clientClaimText}
            </p>
            <div
              className="flex items-center justify-between gap-3 pt-3"
              style={{ borderTop: "1px solid var(--bone-200)" }}
            >
              <span
                className="font-mono"
                style={{ fontSize: "0.62rem", color: "var(--bone-600)" }}
              >
                Full terms are encrypted on Walrus; only the published claim is
                public.
              </span>
              <span
                className="font-mono whitespace-nowrap"
                style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
                title={`Walrus blob (sealed via Seal): ${walrusBlobId}`}
              >
                blob {walrusBlobId}
              </span>
            </div>
          </section>

          {/* Dimensions — are they on track */}
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
              <DimChips dims={oath.dims} />
            </div>
            <div className="flex flex-col gap-4">
              {/* Drawdown — lower is better (inverted). DimGauge renders its
                  own "ceiling: N%" line, so the formatter is single-value. */}
              <DimGauge
                label="Max drawdown"
                current={ddCurrentPct}
                floor={oath.dims.maxDrawdownBps / 100}
                inverted
                formatValue={(v) => `${Math.round(v * 10) / 10}%`}
              />
              {/* Trades — count toward a minimum. */}
              <ProgressGauge
                label="Trades recorded"
                current={oath.tradeCount}
                target={oath.dims.minTrades}
              />
              {/* PnL — higher is better; only when the dimension is active. */}
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
              {/* Volume — higher is better; hidden when min_volume == 0. */}
              {showVolumeGauge && (
                <DimGauge
                  label="Traded volume"
                  current={oath.cumulativeVolume}
                  floor={oath.dims.minVolumeUsdc}
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
                {usdc(oath.bondAmount)}{" "}
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
                {usdc(oath.clientClaim)}{" "}
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
                against bond if broken · {addr(oath.client)}
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
              believerTotal={oath.totalBelieverStakes}
              doubterTotal={oath.totalDoubterStakes}
              height={10}
            />
          </section>
        </div>

        {/* RIGHT — the market */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Stake / settlement preview */}
          {resolved ? (
            <SettlePreview oath={oath} outcome={outcome} />
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
                believerPool={oath.totalBelieverStakes}
                doubterPool={oath.totalDoubterStakes}
                oathId={oath.oathId}
                onchain={oath.onchain}
              />
            </div>
          )}

          {/* Attestation feed — the live tape */}
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
                {resolved ? "archived" : "live"} · {oath.attestations.length}{" "}
                fills
              </span>
            </div>
            {oath.onchain ? (
              <LiveAttestations oathId={oath.oathId} />
            ) : (
              <AttestationFeed rows={oath.attestations} now={NOW} />
            )}
          </section>

          {/* Attestation panel — bound exec wallet only, client component */}
          <AttestPanel oath={oath} />

          {/* Stakers — both sides of the market, as pools */}
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
                      borderTop:
                        i === 0 ? "none" : "1px solid var(--bone-200)",
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
      </div>

      {/* Sticky action bar — Mark Breach / Settle / Claim, absent until valid. */}
      <DetailActionBar oath={oath} />
    </div>
  );
}
