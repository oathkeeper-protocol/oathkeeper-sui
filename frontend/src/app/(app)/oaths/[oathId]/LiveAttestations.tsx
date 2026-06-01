"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { fetchAttestations } from "@/lib/chain";
import AttestationFeed from "@/components/AttestationFeed";

/**
 * Live attestation feed for an on-chain oath — reads TradeAttested events directly,
 * so fills attested by the bound exec wallet appear without a redeploy/re-snapshot.
 */
export default function LiveAttestations({ oathId }: { oathId: string }) {
  const client = useSuiClient();
  const { data, isLoading } = useQuery({
    queryKey: ["attestations", oathId],
    queryFn: () => fetchAttestations(client, oathId),
    refetchInterval: 15_000,
  });

  if (isLoading && !data) {
    return (
      <p className="font-mono" style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}>
        Loading attested fills…
      </p>
    );
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <p className="font-mono" style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}>
        No fills attested yet. The bound exec wallet records trades here as they happen.
      </p>
    );
  }
  return <AttestationFeed rows={rows} now={Date.now()} />;
}
