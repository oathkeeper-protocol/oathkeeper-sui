"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/format";

/**
 * Countdown — a tiny live-ticking countdown atom.
 *
 * Isolated as a client component so cards and panels can stay presentational
 * (Server Components) while still showing a live timer where one is wanted.
 * Ambient by design: it updates the text once a second, no flashing or pulsing.
 * Respects prefers-reduced-motion implicitly (text swap is not an animation).
 *
 * On the server / first paint it renders the value computed from `epochEndMs`
 * against the initial client clock to avoid hydration mismatch flicker.
 */
export default function Countdown({
  epochEndMs,
  className,
  style,
}: {
  epochEndMs: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (epochEndMs <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [epochEndMs]);

  return (
    <span className={className} style={style} suppressHydrationWarning>
      {countdown(epochEndMs, now)}
    </span>
  );
}
