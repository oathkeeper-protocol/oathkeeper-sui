/**
 * Display formatters for the Oathkeeper app.
 *
 * Conventions (see DESIGN.md "Data display conventions"):
 *  - USDC amounts: comma-separated, monospace at the call site. 2 decimals for
 *    sub-dollar precision, 0 for whole numbers.
 *  - Addresses: first 4 + last 4 hex chars.
 *  - Timestamps: relative ("3h ago") in feeds.
 *  - BPS: shown to users as percentages (2000 bps -> "20%").
 *
 * On-chain these values are u64 strings; the mock view-model decodes them to
 * `number` so derived previews can do arithmetic. Pass numbers here.
 */

/** Comma-grouped USDC amount. Whole numbers show no decimals; sub-dollar shows 2. */
export function usdc(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const hasFraction = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Truncate a 0x address to first 4 + last 4 hex chars: 0x1a3f…e4c7 */
export function addr(a: string): string {
  if (!a) return "";
  const hex = a.startsWith("0x") ? a.slice(2) : a;
  if (hex.length <= 8) return a;
  const prefix = a.startsWith("0x") ? "0x" : "";
  return `${prefix}${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

/**
 * Relative time from an absolute epoch-ms timestamp.
 * Future timestamps read as "in 2h"; past as "3h ago"; near-now as "now".
 * Pass `now` to keep server/client renders deterministic if needed.
 */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = ms - now; // positive = future
  const abs = Math.abs(diff);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  let unit: string;
  if (sec < 45) return "now";
  if (sec < 90) unit = "1m";
  else if (min < 60) unit = `${min}m`;
  else if (min < 90) unit = "1h";
  else if (hr < 24) unit = `${hr}h`;
  else if (hr < 36) unit = "1d";
  else unit = `${day}d`;

  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

/**
 * Countdown string from now until an absolute epoch-ms timestamp.
 * Returns "HH:MM:SS" while time remains, "ended" once past.
 * Ambient by design (DESIGN.md) — no flashing at the call site.
 */
export function countdown(epochEndMs: number, now: number = Date.now()): string {
  const remaining = Math.max(0, epochEndMs - now);
  if (remaining === 0) return "ended";
  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Basis points to a one-decimal-max percentage string: 2000 -> "20%", 750 -> "7.5%". */
export function bpsToPct(bps: number): string {
  const pct = bps / 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}
