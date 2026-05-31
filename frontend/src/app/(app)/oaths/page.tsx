"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import OathCard from "@/components/OathCard";
import { OATHS, type Oath, type OathStatus } from "@/lib/mock";

/* ────────────────────────────────────────────────────────────────
   Browse (/oaths) — the marketplace.

   Vertical tabs (Trading / Uptime / Behavior, with live counts), a filter
   rail (status + sort), and a responsive OathCard grid. Dense and scannable
   like an orderbook, not an NFT gallery. SentimentBar (rendered by OathCard
   on Active oaths) is the scan anchor.

   This is a client module because tab / status / sort all drive the visible
   set. OathCard and its children are presentational (the only live atom,
   Countdown, self-ticks), so they bundle fine inside this client tree. No
   Date.now() in render: every sort key is a static field, Countdown owns its
   own clock.
   ──────────────────────────────────────────────────────────────── */

type Vertical = "Trading" | "Uptime" | "Behavior";
type StatusKey = "all" | OathStatus;
type SortKey = "newest" | "ending" | "bond" | "doubted";

const VERTICALS: Vertical[] = ["Trading", "Uptime", "Behavior"];

const STATUS_FILTERS: { key: StatusKey; label: string; dot: string }[] = [
  { key: "all", label: "All", dot: "var(--bone-400)" },
  { key: "Active", label: "Active", dot: "var(--gold)" },
  { key: "Kept", label: "Kept", dot: "var(--sage)" },
  { key: "Broken", label: "Broken", dot: "var(--coral)" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "ending", label: "Ending soon" },
  { key: "bond", label: "Largest bond" },
  { key: "doubted", label: "Most doubted" },
];

/** Doubter share of the combined market, 0 when no capital is staked. */
function doubtShare(o: Oath): number {
  const total = o.totalBelieverStakes + o.totalDoubterStakes;
  return total > 0 ? o.totalDoubterStakes / total : 0;
}

export default function OathsPage() {
  const [tab, setTab] = useState<Vertical>("Trading");
  const [status, setStatus] = useState<StatusKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const oaths = useMemo(() => {
    let list = OATHS.filter((o) => o.oathType === `${tab}Oath`);
    if (status !== "all") list = list.filter((o) => o.status === status);

    const sorted = [...list];
    if (sort === "ending") {
      // Active first, then soonest settlement; resolved oaths sink to the bottom.
      sorted.sort((a, b) => {
        const aActive = a.status === "Active" ? 0 : 1;
        const bActive = b.status === "Active" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return a.epochEndMs - b.epochEndMs;
      });
    } else if (sort === "bond") {
      sorted.sort((a, b) => b.bondAmount - a.bondAmount);
    } else if (sort === "doubted") {
      sorted.sort((a, b) => doubtShare(b) - doubtShare(a));
    }
    // "newest": OATHS is already in newest-first source order; leave as-is.
    return sorted;
  }, [tab, status, sort]);

  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
      {/* Page header */}
      <header className="pt-10 pb-6">
        <div
          className="font-mono"
          style={{
            fontSize: "0.6875rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--bone-600)",
            marginBottom: "0.5rem",
          }}
        >
          Marketplace
        </div>
        <h1
          className="font-sans"
          style={{
            fontSize: "1.875rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--bone-950)",
          }}
        >
          Browse oaths
        </h1>
        <p
          className="text-sm mt-2"
          style={{ color: "var(--bone-600)", maxWidth: "60ch" }}
        >
          Operators bond capital against a multi-dimensional SLA. Open markets
          price whether it holds; settlement is automatic.
        </p>
      </header>

      {/* Vertical tabs */}
      <nav
        className="flex items-center gap-1 mb-6"
        style={{ borderBottom: "1px solid var(--bone-200)" }}
        aria-label="Oath verticals"
      >
        {VERTICALS.map((v) => {
          const count = OATHS.filter((o) => o.oathType === `${v}Oath`).length;
          const selected = tab === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                setTab(v);
                setStatus("all");
              }}
              aria-pressed={selected}
              className="inline-flex items-center gap-2 px-1 pb-3 transition-colors"
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: selected ? "var(--bone-950)" : "var(--bone-600)",
                borderBottom: selected
                  ? "2px solid var(--coral)"
                  : "2px solid transparent",
                marginBottom: -1,
                marginRight: "1.25rem",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {v}
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--bone-600)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 pb-20">
        {/* Filter rail — sidebar on desktop, inline row on mobile */}
        <aside className="lg:w-[200px] lg:flex-shrink-0" aria-label="Filters">
          <FilterControl label="Status">
            <div className="flex flex-wrap lg:flex-col gap-1">
              {STATUS_FILTERS.map((s) => {
                const selected = status === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatus(s.key)}
                    aria-pressed={selected}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors lg:w-full"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: selected ? "var(--bone-950)" : "var(--bone-600)",
                      background: selected ? "var(--cream-deep)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 2,
                        background: s.dot,
                        opacity: selected ? 1 : 0.55,
                        flexShrink: 0,
                      }}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </FilterControl>

          <FilterControl label="Sort by">
            <div className="flex flex-wrap lg:flex-col gap-1">
              {SORTS.map((s) => {
                const selected = sort === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    aria-pressed={selected}
                    className="px-2.5 py-1.5 rounded-md text-left transition-colors lg:w-full"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: selected ? "var(--bone-950)" : "var(--bone-600)",
                      background: selected ? "var(--cream-deep)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </FilterControl>
        </aside>

        {/* Card grid */}
        <div className="flex-1 min-w-0">
          <div
            className="font-mono mb-4"
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.04em",
              color: "var(--bone-600)",
            }}
          >
            {oaths.length} {oaths.length === 1 ? "oath" : "oaths"}
          </div>

          {oaths.length === 0 ? (
            <EmptyState tab={tab} status={status} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {oaths.map((oath) => (
                <OathCard key={oath.oathId} oath={oath} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Screen-local helpers ─────────────────────────────────────────── */

function FilterControl({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 lg:mb-6">
      <div
        className="font-mono"
        style={{
          fontSize: "0.625rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--bone-600)",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ tab, status }: { tab: Vertical; status: StatusKey }) {
  const scope =
    status === "all"
      ? `${tab} oaths`
      : `${status} ${tab} oaths`;

  return (
    <div
      className="flex flex-col items-start"
      style={{
        border: "1px solid var(--bone-200)",
        borderRadius: 12,
        background: "var(--white)",
        padding: "2.5rem 2rem",
      }}
    >
      <div
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--bone-950)",
          marginBottom: "0.5rem",
        }}
      >
        No {scope} right now.
      </div>
      <p
        className="text-sm"
        style={{ color: "var(--bone-600)", maxWidth: "52ch", marginBottom: "1.5rem" }}
      >
        An oath is an operator&rsquo;s bonded SLA: capital posted against a
        multi-dimensional promise, with open markets pricing whether it holds.
        Post one to start building Standing.
      </p>
      <Link href="/mint" className="btn-primary">
        Mint an oath
      </Link>
    </div>
  );
}
