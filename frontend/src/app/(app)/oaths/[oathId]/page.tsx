import Link from "next/link";
import { OATHS, getOath } from "@/lib/mock";
import { addr } from "@/lib/format";
import { explorerObject } from "@/lib/chain-config";

import StandingBadge from "@/components/StandingBadge";
import StatusBadge from "@/components/StatusBadge";
import Countdown from "@/components/Countdown";
import RoleBadge from "@/components/RoleBadge";
import LiveOathView from "./LiveOathView";

/**
 * Oath detail — /oaths/[oathId]
 *
 * Server component that renders static chrome (breadcrumb + title strip) from
 * the snapshot, then delegates ALL market-state to the LiveOathView client island.
 *
 * The URL oathId is ALWAYS passed through — never substituted with a fallback
 * oath. For known snapshot oaths, the title strip renders from the snapshot
 * (preserving real standing counts). For unknown ids (freshly minted oaths),
 * the title strip shows a minimal header and LiveOathView carries the full body
 * once the live query resolves.
 */

/** Prerender every known oath id; unknown ids fall back at request time. */
export function generateStaticParams() {
  return OATHS.map((o) => ({ oathId: o.oathId }));
}

export default async function OathDetailPage({
  params,
}: {
  params: Promise<{ oathId: string }>;
}) {
  const { oathId } = await params;

  // Resolve from snapshot — may be undefined for a freshly minted oath.
  // NEVER cross-fall to a different oath.
  const known = getOath(oathId);

  // Derive explorer URL: use snapshot data if available, else build it live.
  const explorerUrl = known?.explorerUrl ?? (known?.onchain ? explorerObject(oathId) : undefined);

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
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors"
            style={{ color: "var(--sage-deep)", textDecoration: "none" }}
            title="View this oath on the Sui testnet explorer"
          >
            {oathId.slice(0, 10)}...{oathId.slice(-6)}
            <span style={{ fontSize: "0.7em" }} aria-hidden="true">
              ↗ live
            </span>
          </a>
        ) : (
          <span style={{ color: "var(--bone-800)" }}>
            {oathId.slice(0, 10)}...{oathId.slice(-6)}
          </span>
        )}
      </nav>

      {/* Title strip — sourced from snapshot when available so standing counts are real */}
      {known ? (
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
                {known.promiserAlias ?? addr(known.promiser)}
              </h1>
              <RoleBadge role="Oathkeeper" />
              <StatusBadge status={known.status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-mono"
                style={{ fontSize: "0.72rem", color: "var(--bone-600)" }}
              >
                {addr(known.promiser)}
              </span>
              <StandingBadge standing={known.standing} size={9} gap={2} max={14} />
              <span
                className="font-mono"
                style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
              >
                {known.standing.kept} kept · {known.standing.broken} broken
              </span>
            </div>
          </div>

          {/* Ambient countdown / resolved outcome line */}
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
              {known.status !== "Active" ? "Epoch closed" : "Settles in"}
            </div>
            {known.status !== "Active" ? (
              <span
                className="font-mono"
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color:
                    known.breachReason
                      ? "var(--coral-deep)"
                      : "var(--sage-deep)",
                }}
              >
                {known.breachReason
                  ? `Broke on ${known.breachReason}`
                  : "Oath held"}
              </span>
            ) : (
              <Countdown
                epochEndMs={known.epochEndMs}
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
      ) : (
        /* Minimal header for a freshly minted oath not yet in the snapshot */
        <header
          className="pb-6 mb-6"
          style={{ borderBottom: "1px solid var(--bone-200)" }}
        >
          <h1
            className="font-mono"
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "var(--bone-950)",
              letterSpacing: "-0.01em",
            }}
          >
            {oathId.slice(0, 10)}...{oathId.slice(-6)}
          </h1>
          <p
            className="font-mono mt-1"
            style={{ fontSize: "0.7rem", color: "var(--bone-600)" }}
          >
            Loading oath details from chain...
          </p>
        </header>
      )}

      {/* Live body — owns ALL market-state, gauges, pools, actions */}
      <LiveOathView oathId={oathId} fallback={known ?? null} />
    </div>
  );
}
