"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@mysten/dapp-kit";
import CompassMark from "./CompassMark";

const LINKS = [
  { href: "/oaths", label: "Browse" },
  { href: "/mint", label: "Mint" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

/**
 * AppNav — top shell for the market app.
 *
 * Solid cream surface + 1px bottom border. No glassmorphism / backdrop-blur.
 * CompassMark sigil + wordmark on the left, a "Testnet" badge, route links with
 * active state, and the dapp-kit ConnectButton on the right.
 *
 * Client component: needs usePathname for active-link state and renders the
 * interactive ConnectButton.
 */
export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "var(--cream)",
        borderBottom: "1px solid var(--bone-200)",
      }}
      aria-label="App navigation"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: sigil + wordmark + testnet badge */}
        <div className="flex items-center gap-3">
          <Link href="/oaths" className="flex items-center gap-2.5">
            <CompassMark size={20} />
            <span
              className="font-semibold text-sm tracking-tight"
              style={{ color: "var(--bone-950)" }}
            >
              Oathkeeper
            </span>
          </Link>
          <span
            className="font-mono"
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--gold-ink)",
              background: "var(--gold-dim)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            Testnet
          </span>
        </div>

        {/* Center: route links */}
        <div className="hidden sm:flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  color: active ? "var(--bone-950)" : "var(--bone-600)",
                  background: active ? "var(--cream-deep)" : "transparent",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right: wallet connect */}
        <div className="flex items-center">
          <ConnectButton connectText="Connect Wallet" />
        </div>
      </div>
    </nav>
  );
}
