"use client";

/* ────────────────────────────────────────────────────────────────
   OATHKEEPER APP · Portfolio (/portfolio)
   Three sub-tabs: Oathkeeper · Believer · Doubter.
   Client is passive — surfaced as a light notice, not a tab.

   Data note: SELF_ADDRESS is a pure market participant. It owns no
   oaths as promiser and is the Client on none, so the Oathkeeper tab
   renders its teaching empty state and the Client notice reads 0.
   The user's five POSITIONS drive the Believer / Doubter tabs.

   5-role economics only (Oathkeeper / Client / Believer / Doubter /
   Platform; loser stakes split 10/20/70). No LP / underwriter tab.
   ──────────────────────────────────────────────────────────────── */

import { useState } from "react";
import Link from "next/link";
import OathCard from "@/components/OathCard";
import StatusBadge from "@/components/StatusBadge";
import StandingBadge from "@/components/StandingBadge";
import RoleBadge from "@/components/RoleBadge";
import {
  OATHS,
  POSITIONS,
  SELF_ADDRESS,
  getOath,
  type Oath,
  type Position,
} from "@/lib/mock";
import { usdc } from "@/lib/format";

type TabKey = "oathkeeper" | "believer" | "doubter";

// ── Local helpers (screen-only; no new shared components) ────────────────────

/** Absolute settlement date for history tables (DESIGN.md: tables use absolute). */
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
function settledDate(ms: number): string {
  return DATE_FMT.format(new Date(ms));
}

/** Verbatim outcome-derivation rule from the manifest. */
function outcomeOf(oath: Oath): "Kept" | "Broken" {
  if (oath.status === "Settled") return oath.breachReason ? "Broken" : "Kept";
  return oath.status === "Broken" ? "Broken" : "Kept";
}

/** A position is settled once it carries a realized payout. */
function isSettled(p: Position): boolean {
  return p.payout !== undefined;
}

/** Section eyebrow — uppercase mono label above a block. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono"
      style={{
        fontSize: "0.625rem",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--bone-600)",
      }}
    >
      {children}
    </div>
  );
}

/** Compact aggregate stat tile. */
function StatTile({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "win" | "loss";
}) {
  const color =
    tone === "win"
      ? "var(--sage-deep)"
      : tone === "loss"
        ? "var(--coral-deep)"
        : "var(--bone-950)";
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 10,
        padding: "0.875rem 1rem",
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--bone-600)",
          marginBottom: "0.375rem",
        }}
      >
        {label}
      </div>
      <div
        className="font-mono tabular-nums"
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--bone-600)",
              letterSpacing: "0.08em",
              marginLeft: 4,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/** Teaching empty state — explains the role and points to the next action. */
function EmptyState({
  message,
  ctaLabel,
  ctaHref,
}: {
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px dashed var(--bone-300)",
        borderRadius: 10,
        padding: "2rem 1.5rem",
        textAlign: "left",
      }}
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--bone-600)", maxWidth: "44ch", margin: 0 }}
      >
        {message}
      </p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium mt-4"
        style={{ color: "var(--coral-deep)", textDecoration: "none" }}
      >
        {ctaLabel}
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M2.5 7h9M7 2.5l4.5 4.5L7 11.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}

// ── Settled-history table (shared shape across staker tabs) ──────────────────

interface HistoryRow {
  position: Position;
  oath: Oath;
}

/**
 * Settled history for a staker side. Columns: settlement date, oath identity +
 * vertical, capital staked, outcome (StatusBadge), and net P&L (payout − stake).
 */
function StakerHistory({
  title,
  rows,
  side,
}: {
  title: string;
  rows: HistoryRow[];
  side: "Believer" | "Doubter";
}) {
  if (rows.length === 0) return null;

  const cols = "1.1fr 1.6fr 1fr 0.9fr 1fr";

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid var(--bone-200)" }}
      >
        <Eyebrow>{title}</Eyebrow>
      </div>

      {/* Column header */}
      <div
        className="hidden md:grid px-4 py-2.5"
        style={{
          gridTemplateColumns: cols,
          gap: "0.75rem",
          borderBottom: "1px solid var(--bone-200)",
        }}
      >
        {["Settled", "Oath", "Staked", "Outcome", "Net P&L"].map((c, i) => (
          <span
            key={c}
            className="font-mono"
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--bone-600)",
              textAlign: i >= 2 ? "right" : "left",
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map(({ position, oath }, i) => {
        const outcome = outcomeOf(oath);
        const won = side === "Believer" ? outcome === "Kept" : outcome === "Broken";
        const payout = position.payout ?? 0;
        const net = payout - position.stakeAmount;
        const netColor =
          net > 0
            ? "var(--sage-deep)"
            : net < 0
              ? "var(--coral-deep)"
              : "var(--bone-600)";
        const netLabel = `${net > 0 ? "+" : net < 0 ? "−" : ""}${usdc(Math.abs(net))}`;

        return (
          <div
            key={position.positionId}
            className="grid px-4 py-3 items-center"
            style={{
              gridTemplateColumns: cols,
              gap: "0.75rem",
              borderBottom:
                i < rows.length - 1 ? "1px solid var(--bone-200)" : "none",
            }}
          >
            {/* Settled date */}
            <span
              className="font-mono"
              style={{ fontSize: "0.75rem", color: "var(--bone-600)" }}
            >
              {settledDate(oath.epochEndMs)}
            </span>

            {/* Oath identity + vertical */}
            <Link
              href={`/oaths/${oath.oathId}`}
              className="min-w-0"
              style={{ textDecoration: "none" }}
            >
              <div
                className="font-mono truncate"
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--bone-950)",
                }}
              >
                {oath.promiserAlias ?? oath.oathId}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--bone-600)",
                }}
              >
                {oath.oathType.replace("Oath", "")} · {oath.oathId}
              </div>
            </Link>

            {/* Staked */}
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "0.8rem",
                color: "var(--bone-800)",
                textAlign: "right",
              }}
            >
              {usdc(position.stakeAmount)}
            </span>

            {/* Outcome */}
            <span className="flex justify-end">
              <StatusBadge status={outcome} />
            </span>

            {/* Net P&L */}
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: netColor,
                textAlign: "right",
              }}
              title={
                won
                  ? `Payout ${usdc(payout)} on ${position.stakeAmount} staked`
                  : "Stake lost to the winning pool"
              }
            >
              {netLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Oathkeeper tab ───────────────────────────────────────────────────────────

function OathkeeperTab() {
  // Oaths this address has bonded against, as operator.
  const myOaths = OATHS.filter((o) => o.promiser === SELF_ADDRESS);
  const active = myOaths.filter((o) => o.status === "Active");
  const standing = myOaths.reduce(
    (acc, o) => {
      const out = outcomeOf(o);
      if (o.status === "Active") return acc;
      return out === "Kept"
        ? { kept: acc.kept + 1, broken: acc.broken }
        : { kept: acc.kept, broken: acc.broken + 1 };
    },
    { kept: 0, broken: 0 },
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Role context */}
      <div className="flex items-center gap-3">
        <RoleBadge role="Oathkeeper" />
        <span className="text-sm" style={{ color: "var(--bone-600)" }}>
          Bond capital against a service oath and earn from Doubters when you keep it.
        </span>
      </div>

      {/* Standing */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Standing</Eyebrow>
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 10,
            padding: "1rem 1.125rem",
          }}
        >
          <StandingBadge standing={standing} size={16} gap={4} max={16} />
          <span
            className="font-mono"
            style={{ fontSize: "0.8rem", color: "var(--bone-800)" }}
          >
            {standing.kept + standing.broken === 0 ? (
              "No prior oaths"
            ) : (
              <>
                <span style={{ color: "var(--sage-deep)", fontWeight: 600 }}>
                  {standing.kept} kept
                </span>
                {" · "}
                <span style={{ color: "var(--coral-deep)", fontWeight: 600 }}>
                  {standing.broken} broken
                </span>
              </>
            )}
          </span>
        </div>
      </section>

      {/* Active oaths */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Active oaths</Eyebrow>
        {active.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.map((o) => (
              <OathCard key={o.oathId} oath={o} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="You have not bonded an oath as an operator yet. Mint one to put capital behind a service promise and start building Standing."
            ctaLabel="Mint an oath"
            ctaHref="/mint"
          />
        )}
      </section>

      {/* Settled history */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Settled history</Eyebrow>
        <EmptyState
          message="Settled oaths show here once an epoch closes. Bond returned and premium earned on a Kept oath; bond paid to the Client on a Broken one."
          ctaLabel="Browse the market"
          ctaHref="/oaths"
        />
      </section>
    </div>
  );
}

// ── Staker tab (Believer / Doubter — same structure, mirrored economics) ─────

function StakerTab({ side }: { side: "Believer" | "Doubter" }) {
  const positions = POSITIONS.filter((p) => p.side === side);

  const active: HistoryRow[] = [];
  const settled: HistoryRow[] = [];
  for (const p of positions) {
    const oath = getOath(p.oathId);
    if (!oath) continue;
    (isSettled(p) ? settled : active).push({ position: p, oath });
  }

  // Aggregates over SETTLED positions only — active stakes aren't scored yet.
  const totalStaked = settled.reduce((s, r) => s + r.position.stakeAmount, 0);
  const totalReturned = settled.reduce((s, r) => s + (r.position.payout ?? 0), 0);
  const netProfit = totalReturned - totalStaked;
  const wins = settled.filter((r) => (r.position.payout ?? 0) > r.position.stakeAmount).length;
  const winRate = settled.length > 0 ? Math.round((wins / settled.length) * 100) : 0;

  const winsOn = side === "Believer" ? "Kept" : "Broken";
  const pool = side === "Believer" ? "Doubter" : "Believer";

  return (
    <div className="flex flex-col gap-8">
      {/* Role context */}
      <div className="flex items-center gap-3">
        <RoleBadge role={side} />
        <span className="text-sm" style={{ color: "var(--bone-600)" }}>
          Stake {side === "Believer" ? "for" : "against"} an operator. On {winsOn} you
          take 70% of the {pool} pool pro-rata; the Platform takes 10%.
        </span>
      </div>

      {/* Aggregates (settled) — single stat row, vertical dividers */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Settled performance</Eyebrow>
        <div
          className="grid grid-cols-2 md:grid-cols-4 overflow-hidden"
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 10,
          }}
        >
          {[
            {
              label: "Staked",
              value: usdc(totalStaked),
              unit: "USDC",
              tone: "default" as const,
            },
            {
              label: "Returned",
              value: usdc(totalReturned),
              unit: "USDC",
              tone: (totalReturned > totalStaked ? "win" : "default") as "win" | "default",
            },
            {
              label: "Net P&L",
              value: `${netProfit >= 0 ? "+" : "−"}${usdc(Math.abs(netProfit))}`,
              unit: "USDC",
              tone: (netProfit > 0 ? "win" : netProfit < 0 ? "loss" : "default") as "win" | "loss" | "default",
            },
            {
              label: "Win rate",
              value: `${winRate}%`,
              unit: undefined,
              tone: "default" as const,
            },
          ].map((stat, i) => {
            const color =
              stat.tone === "win"
                ? "var(--sage-deep)"
                : stat.tone === "loss"
                  ? "var(--coral-deep)"
                  : "var(--bone-950)";
            return (
              <div
                key={stat.label}
                className="flex flex-col px-4 py-3"
                style={{
                  borderLeft: i > 0 ? "1px solid var(--bone-200)" : "none",
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--bone-600)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {stat.label}
                </div>
                <div
                  className="font-mono tabular-nums"
                  style={{ fontSize: "1.125rem", fontWeight: 700, color, letterSpacing: "-0.01em" }}
                >
                  {stat.value}
                  {stat.unit && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        color: "var(--bone-600)",
                        letterSpacing: "0.08em",
                        marginLeft: 4,
                      }}
                    >
                      {stat.unit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active stakes */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Active stakes</Eyebrow>
        {active.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.map(({ position, oath }) => (
              <div key={position.positionId} className="flex flex-col gap-2">
                <OathCard oath={oath} />
                <div
                  className="flex items-center justify-between font-mono px-1"
                  style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
                >
                  <span>
                    Your {side.toLowerCase()} stake
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ color: "var(--bone-950)", fontWeight: 600 }}
                  >
                    {usdc(position.stakeAmount)} USDC
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            message={`You have no open ${side.toLowerCase()} positions. Find an oath you want to stake ${
              side === "Believer" ? "for" : "against"
            } in the market.`}
            ctaLabel="Browse oaths"
            ctaHref="/oaths"
          />
        )}
      </section>

      {/* Settled history */}
      <StakerHistory title="Settled history" rows={settled} side={side} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: "oathkeeper", label: "Oathkeeper" },
  { key: "believer", label: "Believer" },
  { key: "doubter", label: "Doubter" },
];

export default function PortfolioPage() {
  // Default to Believer: the demo address is a market participant, so its
  // first populated surface is its staking positions.
  const [tab, setTab] = useState<TabKey>("believer");

  const clientCount = OATHS.filter((o) => o.client === SELF_ADDRESS).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <header className="mb-2">
        <h1
          className="font-bold"
          style={{
            fontSize: "1.75rem",
            letterSpacing: "-0.02em",
            color: "var(--bone-950)",
          }}
        >
          Portfolio
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--bone-600)" }}>
          Your positions across every role you play in the market.
        </p>
      </header>

      {/* Client notice — passive role, light line not a tab */}
      <div
        className="flex items-center gap-2 mb-6 text-sm"
        style={{ color: "var(--bone-600)" }}
      >
        <RoleBadge role="Client" size="xs" />
        <span>
          Oaths where you are the Client:{" "}
          <span
            className="font-mono tabular-nums"
            style={{ color: "var(--bone-950)", fontWeight: 600 }}
          >
            {clientCount}
          </span>
          {clientCount === 0 && ". No operator has named you as a counterparty."}
        </span>
      </div>

      {/* Sub-tabs */}
      <div
        className="flex items-center gap-1 mb-8"
        role="tablist"
        aria-label="Portfolio role"
      >
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.key)}
              className="font-sans transition-colors"
              style={{
                fontSize: "0.85rem",
                fontWeight: 500,
                padding: "0.5rem 0.875rem",
                borderRadius: 8,
                cursor: "pointer",
                color: selected ? "var(--bone-950)" : "var(--bone-600)",
                background: selected ? "var(--white)" : "transparent",
                border: selected
                  ? "1px solid var(--bone-200)"
                  : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div role="tabpanel">
        {tab === "oathkeeper" && <OathkeeperTab />}
        {tab === "believer" && <StakerTab side="Believer" />}
        {tab === "doubter" && <StakerTab side="Doubter" />}
      </div>
    </div>
  );
}
