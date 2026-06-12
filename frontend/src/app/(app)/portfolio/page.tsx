"use client";

/* ────────────────────────────────────────────────────────────────
   OATHKEEPER APP · Portfolio (/portfolio)
   Three sub-tabs: Oathkeeper · Believer · Doubter.
   Reads LIVE on-chain data for the connected wallet.
   If no wallet is connected, shows a prompt to connect.
   ──────────────────────────────────────────────────────────────── */

import { useState } from "react";
import Link from "next/link";
import { useCurrentAccount, useSuiClient, ConnectButton } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

import OathCard from "@/components/OathCard";
import StatusBadge from "@/components/StatusBadge";
import StandingBadge from "@/components/StandingBadge";
import RoleBadge from "@/components/RoleBadge";
import SentimentBar from "@/components/SentimentBar";

import {
  fetchAllOaths,
  fetchOathkeeperOaths,
  fetchOwnedPositions,
  type OwnedPosition,
} from "@/lib/chain";
import type { Oath } from "@/lib/mock";
import { usdc } from "@/lib/format";

type TabKey = "oathkeeper" | "believer" | "doubter";

// ── Shared micro-components ──────────────────────────────────────────────────

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

// ── Oathkeeper tab ───────────────────────────────────────────────────────────

function OathkeeperTab({ myOaths }: { myOaths: Oath[] }) {
  const active = myOaths.filter((o) => o.status === "Active");

  const standing = myOaths.reduce(
    (acc, o) => {
      if (o.status === "Active") return acc;
      if (o.status === "Kept" || (o.status === "Settled" && !o.breachReason)) {
        return { kept: acc.kept + 1, broken: acc.broken };
      }
      return { kept: acc.kept, broken: acc.broken + 1 };
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
            message="You have not minted any oaths yet. Mint one to put capital behind a service commitment and start building Standing."
            ctaLabel="Mint an oath"
            ctaHref="/mint"
          />
        )}
      </section>

      {/* All oaths history */}
      {myOaths.filter((o) => o.status !== "Active").length > 0 && (
        <section className="flex flex-col gap-3">
          <Eyebrow>Settled history</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myOaths
              .filter((o) => o.status !== "Active")
              .map((o) => (
                <OathCard key={o.oathId} oath={o} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Staker tab (Believer / Doubter — same structure, mirrored economics) ─────

function StakerTab({
  side,
  positions,
  oathMap,
}: {
  side: "Believer" | "Doubter";
  positions: OwnedPosition[];
  oathMap: Map<string, Oath>;
}) {
  const myPositions = positions.filter((p) => p.side === side);

  const totalStaked = myPositions.reduce((s, p) => s + p.stakeAmount, 0);

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

      {/* Aggregate stat row */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Summary</Eyebrow>
        <div
          className="flex items-center gap-6 px-4 py-3"
          style={{
            background: "var(--white)",
            border: "1px solid var(--bone-200)",
            borderRadius: 10,
          }}
        >
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--bone-600)",
                marginBottom: "0.25rem",
              }}
            >
              Positions
            </div>
            <div
              className="font-mono tabular-nums"
              style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--bone-950)" }}
            >
              {myPositions.length}
            </div>
          </div>
          <div
            aria-hidden="true"
            style={{ width: 1, height: 32, background: "var(--bone-200)" }}
          />
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--bone-600)",
                marginBottom: "0.25rem",
              }}
            >
              Total staked
            </div>
            <div
              className="font-mono tabular-nums"
              style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--bone-950)" }}
            >
              {usdc(totalStaked)}{" "}
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  color: "var(--bone-600)",
                  letterSpacing: "0.08em",
                }}
              >
                USDC
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Positions */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Positions</Eyebrow>
        {myPositions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {myPositions.map((position) => {
              const oath = oathMap.get(position.oathId);
              return (
                <div
                  key={position.positionId}
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--bone-200)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {/* Oath identity row */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: "1px solid var(--bone-200)" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {oath ? (
                        <Link
                          href={`/oaths/${position.oathId}`}
                          style={{ textDecoration: "none" }}
                        >
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "var(--bone-950)",
                            }}
                          >
                            {oath.promiserAlias ?? oath.oathId.slice(0, 10) + "..."}
                          </span>
                        </Link>
                      ) : (
                        <span
                          className="font-mono truncate"
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--bone-600)",
                            maxWidth: "20ch",
                          }}
                          title={position.oathId}
                        >
                          {position.oathId.slice(0, 10)}...
                        </span>
                      )}
                      {oath && <StatusBadge status={oath.status} />}
                    </div>
                    <div className="flex items-center gap-3">
                      {position.claimed && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: "0.6rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                            color: "var(--sage-deep)",
                          }}
                        >
                          Claimed
                        </span>
                      )}
                      <span
                        className="font-mono tabular-nums"
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--bone-950)",
                        }}
                      >
                        {usdc(position.stakeAmount)}{" "}
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 500,
                            color: "var(--bone-600)",
                          }}
                        >
                          USDC
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Sentiment bar — only when oath is resolved */}
                  {oath && (
                    <div className="px-4 py-3">
                      <SentimentBar
                        believerTotal={oath.totalBelieverStakes}
                        doubterTotal={oath.totalDoubterStakes}
                        height={5}
                        showLabels
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            message={`You have no ${side.toLowerCase()} positions. Find an oath you want to stake ${
              side === "Believer" ? "for" : "against"
            } in the market.`}
            ctaLabel="Browse oaths"
            ctaHref="/oaths"
          />
        )}
      </section>
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
  const [tab, setTab] = useState<TabKey>("doubter");
  const account = useCurrentAccount();
  const client = useSuiClient();

  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["portfolio", account?.address],
    queryFn: async () => {
      const addr = account!.address;
      const [positions, myOaths, allOaths] = await Promise.all([
        fetchOwnedPositions(client, addr),
        fetchOathkeeperOaths(client, addr),
        fetchAllOaths(client),
      ]);
      const oathMap = new Map<string, Oath>(allOaths.map((o) => [o.oathId, o]));
      return { positions, myOaths, allOaths, oathMap };
    },
    enabled: !!account,
    staleTime: 30_000,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
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
          </div>
          {account && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isPending || isRefetching}
              className="btn-secondary"
              style={{
                fontSize: "0.72rem",
                padding: "5px 12px",
                opacity: isPending || isRefetching ? 0.6 : 1,
                cursor: isPending || isRefetching ? "not-allowed" : "pointer",
              }}
            >
              {isRefetching ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>
      </header>

      {/* No wallet connected */}
      {!account && (
        <div
          style={{
            background: "var(--white)",
            border: "1px dashed var(--bone-300)",
            borderRadius: 12,
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "var(--bone-600)", maxWidth: "40ch", margin: "0 auto 1.5rem" }}
          >
            Connect your wallet to see your positions as Oathkeeper, Believer, or Doubter.
          </p>
          <ConnectButton connectText="Connect Wallet" />
        </div>
      )}

      {/* Wallet connected — show tabs */}
      {account && (
        <>
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

          {/* Loading */}
          {isPending && (
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--bone-200)",
                borderRadius: 10,
                padding: "2rem",
              }}
            >
              <p
                className="font-mono text-sm"
                style={{ color: "var(--bone-600)" }}
              >
                Loading positions from chain...
              </p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--coral-deep)",
                borderRadius: 10,
                padding: "1.5rem",
              }}
            >
              <p
                className="font-mono text-sm"
                style={{ color: "var(--coral-deep)" }}
              >
                Failed to load positions. Check your connection and try refreshing.
              </p>
            </div>
          )}

          {/* Panel */}
          {data && !isPending && (
            <div role="tabpanel">
              {tab === "oathkeeper" && (
                <OathkeeperTab myOaths={data.myOaths} />
              )}
              {tab === "believer" && (
                <StakerTab
                  side="Believer"
                  positions={data.positions}
                  oathMap={data.oathMap}
                />
              )}
              {tab === "doubter" && (
                <StakerTab
                  side="Doubter"
                  positions={data.positions}
                  oathMap={data.oathMap}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
