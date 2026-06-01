"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { fetchSentimentSeries } from "@/lib/chain";
import SentimentChart from "@/components/SentimentChart";

/**
 * LiveSentiment — client wrapper that fetches the sentiment series for a live
 * oath and renders the SentimentChart. Used by the Detail page (server component)
 * as an isolated interactive island.
 */
export default function LiveSentiment({ oathId }: { oathId: string }) {
  const client = useSuiClient();

  const { data: series, isPending, isError } = useQuery({
    queryKey: ["sentimentSeries", oathId],
    queryFn: () => fetchSentimentSeries(client, oathId),
    staleTime: 30_000,
  });

  if (isPending) {
    return (
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--bone-200)",
          borderRadius: 10,
          padding: "1.25rem",
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--bone-600)",
            marginBottom: "0.75rem",
          }}
        >
          Market condition
        </div>
        <div
          className="font-mono"
          style={{ fontSize: "0.72rem", color: "var(--bone-600)" }}
        >
          Loading chart...
        </div>
      </div>
    );
  }

  if (isError || !series) {
    return null;
  }

  return (
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
        Market condition: believer share
      </span>
      <SentimentChart series={series} />
    </section>
  );
}
