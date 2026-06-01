"use client";

import { useState, useEffect } from "react";
import type { SentimentPoint } from "@/lib/chain";

/**
 * SentimentChart — Polymarket-style "price of reliability" chart.
 *
 * Renders the believer share of the total pool over time as a line at 0-100%.
 * A reference line at 50% separates the believers-favored from doubters-favored
 * zones. If fewer than 2 data points exist, renders a sparse-data placeholder.
 *
 * Pure SVG. No animation beyond a prefers-reduced-motion-aware fade-in.
 * No deps beyond React.
 */

interface Props {
  series: SentimentPoint[];
}

const W = 480;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function pctSeries(series: SentimentPoint[]): number[] {
  return series.map((p) => {
    const total = p.believer + p.doubter;
    if (total === 0) return 50;
    return (p.believer / total) * 100;
  });
}

function buildPolyline(pcts: number[]): string {
  if (pcts.length === 0) return "";
  const n = pcts.length;
  return pcts
    .map((pct, i) => {
      const x = PAD.left + (n === 1 ? INNER_W / 2 : (i / (n - 1)) * INNER_W);
      const y = PAD.top + ((100 - pct) / 100) * INNER_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(pcts: number[]): string {
  if (pcts.length === 0) return "";
  const n = pcts.length;
  const pts = pcts.map((pct, i) => {
    const x = PAD.left + (n === 1 ? INNER_W / 2 : (i / (n - 1)) * INNER_W);
    const y = PAD.top + ((100 - pct) / 100) * INNER_H;
    return { x, y };
  });
  const bottom = PAD.top + INNER_H;
  const firstX = pts[0].x.toFixed(1);
  const lastX = pts[pts.length - 1].x.toFixed(1);
  const linePts = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return `M ${firstX} ${bottom} L ${linePts} L ${lastX} ${bottom} Z`;
}

export default function SentimentChart({ series }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (series.length < 2) {
    return (
      <div
        style={{
          background: "var(--white)",
          border: "1px dashed var(--bone-300)",
          borderRadius: 10,
          padding: "1.25rem",
          textAlign: "center",
        }}
      >
        <p
          className="font-mono"
          style={{ fontSize: "0.72rem", color: "var(--bone-600)", margin: 0 }}
        >
          Not enough market activity yet. Stake to price this oath.
        </p>
      </div>
    );
  }

  const pcts = pctSeries(series);
  const latest = pcts[pcts.length - 1];
  const polyline = buildPolyline(pcts);
  const areaPath = buildAreaPath(pcts);

  // Reference y for 50%
  const midY = PAD.top + INNER_H / 2;
  // Latest point position
  const lastX =
    PAD.left + ((pcts.length - 1) / (pcts.length - 1)) * INNER_W;
  const lastY = PAD.top + ((100 - latest) / 100) * INNER_H;

  // Y-axis labels
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label={`Believer share chart. Latest value: ${latest.toFixed(0)}%`}
        role="img"
      >
        <defs>
          <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sage-deep)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--sage-deep)" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="sentClip">
            <rect
              x={PAD.left}
              y={PAD.top}
              width={INNER_W}
              height={INNER_H}
            />
          </clipPath>
        </defs>

        {/* Y-axis tick lines + labels */}
        {yTicks.map((tick) => {
          const y = PAD.top + ((100 - tick) / 100) * INNER_H;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + INNER_W}
                y2={y}
                stroke="var(--bone-200)"
                strokeWidth={tick === 50 ? 1.5 : 1}
                strokeDasharray={tick === 50 ? "3 3" : "none"}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontFamily="var(--font-mono, monospace)"
                fontSize={9}
                fill="var(--bone-600)"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#sentFill)"
          clipPath="url(#sentClip)"
        />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--sage-deep)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#sentClip)"
        />

        {/* Latest-value dot */}
        <circle
          cx={lastX}
          cy={lastY}
          r={3.5}
          fill="var(--sage-deep)"
          clipPath="url(#sentClip)"
        />

        {/* Latest-value label */}
        <text
          x={lastX + 6}
          y={lastY + 4}
          fontFamily="var(--font-mono, monospace)"
          fontSize={9}
          fontWeight={700}
          fill="var(--sage-deep)"
        >
          {latest.toFixed(0)}%
        </text>

        {/* X-axis: "Earlier" → "Latest" */}
        <text
          x={PAD.left}
          y={H - 4}
          fontFamily="var(--font-mono, monospace)"
          fontSize={8}
          fill="var(--bone-400)"
        >
          Earlier
        </text>
        <text
          x={PAD.left + INNER_W}
          y={H - 4}
          textAnchor="end"
          fontFamily="var(--font-mono, monospace)"
          fontSize={8}
          fill="var(--bone-400)"
        >
          Latest
        </text>
      </svg>

      {/* Legend */}
      <div
        className="flex items-center justify-between font-mono mt-1"
        style={{ fontSize: "0.6rem", color: "var(--bone-600)" }}
      >
        <span style={{ color: "var(--sage-deep)" }}>
          Believer share — {latest.toFixed(0)}%
        </span>
        <span style={{ color: "var(--coral-deep)" }}>
          Doubter share — {(100 - latest).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
