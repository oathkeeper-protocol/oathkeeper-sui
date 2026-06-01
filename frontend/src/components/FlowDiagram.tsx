import { settlementFlow } from "@/lib/economics";
import { usdc, bpsToPct } from "@/lib/format";
import { SPLIT } from "@/lib/mock";

/**
 * FlowDiagram — settlement money flow as a directed, sankey-lite SVG.
 *
 * Kept:   Bond -> Oathkeeper; Doubter pool (loser) split
 *         10% Platform / 20% Oathkeeper / 70% Believers; Believer pool returned.
 * Broken: Bond -> Client (claim) + Platform (residual); Believer pool (loser)
 *         split 10% Platform / 20% Client / 70% Doubters; Doubter pool returned.
 *
 * The 10% Platform fee is shown explicitly (it is disclosed, never hidden).
 * A conservation line "total in = total out" sits below. Pure presentational.
 */
export default function FlowDiagram({
  outcome,
  bondAmount,
  clientClaim,
  believerPool,
  doubterPool,
}: {
  outcome: "Kept" | "Broken";
  bondAmount: number;
  clientClaim: number;
  believerPool: number;
  doubterPool: number;
}) {
  const f = settlementFlow(
    outcome,
    bondAmount,
    clientClaim,
    believerPool,
    doubterPool,
  );
  const conserves = Math.abs(f.totalIn - f.totalOut) < 0.01;

  // Edge model: { from-label, to-role, to-label, amount, color }.
  // Colors track the role receiving the money.
  const platformBg = "var(--bone-800)";
  const goldC = "var(--gold-deep)";
  const steelC = "var(--steel-deep)";
  const sageC = "var(--sage-deep)";
  const coralC = "var(--coral-deep)";

  type Edge = { source: string; target: string; amount: number; color: string };
  const edges: Edge[] =
    outcome === "Kept"
      ? [
          { source: "Bond", target: "Oathkeeper", amount: f.bondToPromiser, color: goldC },
          { source: "Believer pool", target: "Believers (returned)", amount: f.winnerPoolReturned, color: sageC },
          { source: "Doubter pool", target: `Platform (${bpsToPct(SPLIT.platformBps)})`, amount: f.loserToPlatform, color: platformBg },
          { source: "Doubter pool", target: `Oathkeeper (${bpsToPct(SPLIT.secondaryBps)})`, amount: f.loserToSecondary, color: goldC },
          { source: "Doubter pool", target: `Believers (${bpsToPct(SPLIT.winnerBps)} pro-rata)`, amount: f.loserToWinners, color: sageC },
        ]
      : [
          { source: "Bond", target: "Client (claim)", amount: f.bondToClient, color: steelC },
          { source: "Bond", target: "Platform (residual)", amount: f.bondResidualToPlatform, color: platformBg },
          { source: "Doubter pool", target: "Doubters (returned)", amount: f.winnerPoolReturned, color: coralC },
          { source: "Believer pool", target: `Platform (${bpsToPct(SPLIT.platformBps)})`, amount: f.loserToPlatform, color: platformBg },
          { source: "Believer pool", target: `Client (${bpsToPct(SPLIT.secondaryBps)})`, amount: f.loserToSecondary, color: steelC },
          { source: "Believer pool", target: `Doubters (${bpsToPct(SPLIT.winnerBps)} pro-rata)`, amount: f.loserToWinners, color: coralC },
        ];

  const visible = edges.filter((e) => e.amount > 0);

  // Group edges by source for the left column.
  const sources = Array.from(new Set(visible.map((e) => e.source)));

  // Layout
  const W = 520;
  const rowH = 44;
  const H = Math.max(visible.length, 1) * rowH + 24;
  const leftX = 8;
  const leftW = 140;
  const rightX = W - 8 - 200;
  const rightW = 200;
  const maxAmount = Math.max(...visible.map((e) => e.amount), 1);

  // Assign each edge a vertical row.
  const rows = visible.map((e, i) => ({ ...e, y: 12 + i * rowH + rowH / 2 }));
  // Source node center = mean y of its edges.
  const sourceY: Record<string, number> = {};
  for (const s of sources) {
    const ys = rows.filter((r) => r.source === s).map((r) => r.y);
    sourceY[s] = ys.reduce((a, b) => a + b, 0) / ys.length;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", maxWidth: W }}
        role="img"
        aria-label={`${outcome} settlement money flow. Total in ${usdc(
          f.totalIn,
        )} USDC equals total out ${usdc(f.totalOut)} USDC.`}
      >
        {/* Flow links */}
        {rows.map((r, i) => {
          const sx = leftX + leftW;
          const sy = sourceY[r.source];
          const tx = rightX;
          const ty = r.y;
          const midX = (sx + tx) / 2;
          const strokeW = 1.5 + (r.amount / maxAmount) * 7;
          return (
            <path
              key={`link-${i}`}
              d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`}
              fill="none"
              stroke={r.color}
              strokeWidth={strokeW}
              strokeOpacity={0.28}
              strokeLinecap="round"
            />
          );
        })}

        {/* Source nodes (left) */}
        {sources.map((s) => (
          <g key={`src-${s}`}>
            <rect
              x={leftX}
              y={sourceY[s] - 11}
              width={leftW}
              height={22}
              rx={5}
              fill="var(--cream-deep)"
              stroke="var(--bone-200)"
            />
            <text
              x={leftX + leftW / 2}
              y={sourceY[s] + 4}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--font-figtree), sans-serif"
              fill="var(--bone-800)"
            >
              {s}
            </text>
          </g>
        ))}

        {/* Target nodes (right) */}
        {rows.map((r, i) => (
          <g key={`tgt-${i}`}>
            <rect
              x={rightX}
              y={r.y - 13}
              width={rightW}
              height={26}
              rx={5}
              fill="var(--white)"
              stroke="var(--bone-200)"
            />
            <text
              x={rightX + 10}
              y={r.y - 1}
              fontSize={10.5}
              fontFamily="var(--font-figtree), sans-serif"
              fill={r.color}
              fontWeight={600}
            >
              {r.target}
            </text>
            <text
              x={rightX + 10}
              y={r.y + 11}
              fontSize={10}
              fontFamily="var(--font-source-code-pro), monospace"
              fill="var(--bone-600)"
            >
              {usdc(r.amount)} USDC
            </text>
          </g>
        ))}
      </svg>

      {/* Conservation line */}
      <div
        className="font-mono flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 px-3 py-2"
        style={{
          fontSize: "0.7rem",
          color: "var(--bone-600)",
          background: "var(--cream-deep)",
          borderRadius: 6,
        }}
      >
        <span>Total in</span>
        <span className="tabular-nums" style={{ color: "var(--bone-950)", fontWeight: 600 }}>
          {usdc(f.totalIn)}
        </span>
        <span style={{ color: "var(--bone-600)" }}>=</span>
        <span>Total out</span>
        <span className="tabular-nums" style={{ color: "var(--bone-950)", fontWeight: 600 }}>
          {usdc(f.totalOut)}
        </span>
        <span
          className="ml-auto"
          style={{
            color: conserves ? "var(--sage-deep)" : "var(--coral-deep)",
            fontWeight: 600,
          }}
        >
          {conserves ? "conservation holds" : "imbalance"}
        </span>
      </div>
    </div>
  );
}
