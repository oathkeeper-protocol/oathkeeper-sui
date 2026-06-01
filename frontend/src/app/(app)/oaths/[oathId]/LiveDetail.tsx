"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOath } from "@/lib/chain";
import { usdc } from "@/lib/format";
import type { Oath } from "@/lib/mock";
import SentimentBar from "@/components/SentimentBar";

/**
 * LiveDetail — client overlay that fetches live pool totals + sentiment
 * for one oath and renders a "Live pool" strip.
 *
 * The SSR page keeps its static composition for first paint. This island
 * mounts on top and replaces the market-state numbers (believer/doubter
 * pool totals) once live data arrives. Only activates for onchain oaths.
 */
export default function LiveDetail({
  oathId,
  fallback,
}: {
  oathId: string;
  /** SSR oath for first-paint state while the live fetch is in flight. */
  fallback: Oath;
}) {
  if (!fallback.onchain) return null;

  return <LiveDetailInner oathId={oathId} fallback={fallback} />;
}

function LiveDetailInner({ oathId, fallback }: { oathId: string; fallback: Oath }) {
  const client = useSuiClient();
  const queryClient = useQueryClient();

  const { data: liveOath, isFetching, refetch } = useQuery({
    queryKey: ["oath", oathId],
    queryFn: () => fetchOath(client, oathId),
    initialData: fallback,
    staleTime: 30_000,
  });

  const oath = liveOath ?? fallback;
  const believer = oath.totalBelieverStakes;
  const doubter = oath.totalDoubterStakes;
  const total = believer + doubter;

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["sentimentSeries", oathId] });
  };

  return (
    <section
      style={{
        background: "var(--white)",
        border: "1px solid var(--bone-200)",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        marginBottom: "1.25rem",
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
          Live pool · testnet
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            color: isFetching ? "var(--bone-400)" : "var(--bone-600)",
            background: "transparent",
            border: "1px solid var(--bone-200)",
            borderRadius: 4,
            padding: "0.15rem 0.5rem",
            cursor: isFetching ? "not-allowed" : "pointer",
          }}
        >
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="flex items-center gap-6 mb-3 flex-wrap">
        <div>
          <div
            className="font-mono"
            style={{ fontSize: "0.6rem", color: "var(--bone-600)", marginBottom: "0.2rem" }}
          >
            Believer pool
          </div>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: "1rem", fontWeight: 700, color: "var(--sage-deep)" }}
          >
            {usdc(believer)}{" "}
            <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--bone-600)" }}>
              USDC
            </span>
          </span>
        </div>
        <div>
          <div
            className="font-mono"
            style={{ fontSize: "0.6rem", color: "var(--bone-600)", marginBottom: "0.2rem" }}
          >
            Doubter pool
          </div>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: "1rem", fontWeight: 700, color: "var(--coral-deep)" }}
          >
            {usdc(doubter)}{" "}
            <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--bone-600)" }}>
              USDC
            </span>
          </span>
        </div>
        <div>
          <div
            className="font-mono"
            style={{ fontSize: "0.6rem", color: "var(--bone-600)", marginBottom: "0.2rem" }}
          >
            Total staked
          </div>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: "1rem", fontWeight: 700, color: "var(--bone-950)" }}
          >
            {usdc(total)}{" "}
            <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--bone-600)" }}>
              USDC
            </span>
          </span>
        </div>
      </div>

      <SentimentBar
        believerTotal={believer}
        doubterTotal={doubter}
        height={8}
      />
    </section>
  );
}
