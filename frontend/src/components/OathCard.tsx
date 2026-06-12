import Link from "next/link";
import type { Oath } from "@/lib/mock";
import { usdc, addr } from "@/lib/format";
import StandingBadge from "./StandingBadge";
import StatusBadge from "./StatusBadge";
import SentimentBar from "./SentimentBar";
import DimChips from "./DimChips";
import Countdown from "./Countdown";
import TierBadge from "./TierBadge";

/**
 * OathCard — one oath in the marketplace grid.
 *
 * Reading order per DESIGN.md:
 *   1. Operator identity (alias / address + StandingBadge)  — WHO
 *   2. Bond size (mono)                                     — HOW MUCH
 *   3. Market sentiment (Believer/Doubter)                  — WHAT the crowd thinks
 *   4. Client claim + SLA dimension chips                   — WHAT was promised
 *   5. Time remaining / outcome                             — WHEN it resolves
 *   6. View action                                          — WHAT I can do
 *
 * Varies by status (not an identical-card clone): Active cards show the live
 * SentimentBar + countdown + Doubt/Believe affordance; resolved cards (Kept /
 * Broken / Settled) drop the live market and surface the outcome instead.
 *
 * Pure presentational. The whole card is a link to the detail route; the live
 * countdown is delegated to the <Countdown> client atom.
 */
export default function OathCard({ oath }: { oath: Oath }) {
  const resolved = oath.status !== "Active";
  const accent =
    oath.status === "Broken"
      ? "var(--coral)"
      : oath.status === "Kept"
        ? "var(--sage)"
        : oath.status === "Settled"
          ? "var(--bone-300)"
          : "var(--gold)";

  return (
    <Link
      href={`/oaths/${oath.oathId}`}
      className="group flex flex-col transition-shadow"
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 12,
        overflow: "hidden",
        textDecoration: "none",
        position: "relative",
      }}
    >
      {/* Top accent rule — top only, not a side stripe. Status-tinted. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent,
        }}
      />

      {/* 1. Operator identity + status */}
      <div
        className="flex items-start justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid var(--bone-200)" }}
      >
        <div>
          <div
            className="font-mono"
            style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--bone-950)" }}
          >
            {oath.promiserAlias ?? addr(oath.promiser)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="font-mono"
              style={{ fontSize: "0.65rem", color: "var(--bone-600)" }}
            >
              {addr(oath.promiser)}
            </span>
            <StandingBadge standing={oath.standing} size={7} gap={2} max={8} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="font-mono"
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--bone-600)",
            }}
          >
            {oath.oathType.replace("Oath", "")}
          </span>
          <StatusBadge status={oath.status} />
          {oath.oathType === "TradingOath" && (
            <TierBadge tier={oath.verifiabilityTier} compact />
          )}
          {oath.onchain && (
            <span
              className="inline-flex items-center gap-1 font-mono"
              style={{ fontSize: "0.55rem", letterSpacing: "0.08em", color: "var(--sage-deep)" }}
              title="Read live from the Sui testnet deployment"
            >
              <span
                aria-hidden="true"
                style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sage-deep)" }}
              />
              LIVE · TESTNET
            </span>
          )}
        </div>
      </div>

      {/* 2. Bond */}
      <div className="px-4 pt-3 pb-2">
        <div
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--bone-600)",
            marginBottom: "0.125rem",
          }}
        >
          Bond posted
        </div>
        <div
          className="font-mono tabular-nums"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--bone-950)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {usdc(oath.bondAmount)}{" "}
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 500,
              color: "var(--bone-600)",
              letterSpacing: "0.08em",
            }}
          >
            USDC
          </span>
        </div>
      </div>

      {/* 3. Market sentiment — live oaths only */}
      {!resolved && (
        <div className="px-4 py-3">
          <SentimentBar
            believerTotal={oath.totalBelieverStakes}
            doubterTotal={oath.totalDoubterStakes}
          />
        </div>
      )}

      {/* 4. Client claim + dimensions */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--bone-200)" }}>
        <p
          className="text-sm leading-snug mb-2.5"
          style={{ color: "var(--bone-800)" }}
        >
          {oath.clientClaimText}
        </p>
        <DimChips dims={oath.dims} />
      </div>

      {/* 5 + 6. Footer: time / outcome + view affordance */}
      <div
        className="flex items-center justify-between px-4 py-3 mt-auto"
        style={{ borderTop: "1px solid var(--bone-200)" }}
      >
        {resolved ? (
          <span
            className="font-mono"
            style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
          >
            {oath.breachReason
              ? `Broke on ${oath.breachReason}`
              : "Oath held"}
          </span>
        ) : (
          <span
            className="font-mono"
            style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
          >
            Settles in{" "}
            <Countdown
              epochEndMs={oath.epochEndMs}
              style={{ color: "var(--gold-deep)", fontWeight: 600 }}
            />
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
          style={{ color: "var(--coral-deep)" }}
        >
          {resolved ? "View settlement" : "View oath"}
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M2.5 7h9M7 2.5l4.5 4.5L7 11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
