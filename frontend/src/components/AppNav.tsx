"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import CompassMark from "./CompassMark";
import { USDC_TYPE } from "@/lib/chain-config";
import { buildFaucetPtb } from "@/lib/ptb";
import { usdc } from "@/lib/format";

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
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute, isPending: faucetPending } = useSignAndExecuteTransaction();

  const { data: balanceData, refetch: refetchBalance } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address as string, coinType: USDC_TYPE },
    { enabled: !!account },
  );

  const usdcBalance = balanceData ? usdc(Number(balanceData.totalBalance)) : null;

  const handleFaucet = () => {
    if (faucetPending) return;
    const tx = buildFaucetPtb();
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await client.waitForTransaction({ digest });
          refetchBalance();
        },
      },
    );
  };

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

        {/* Right: USDC balance + faucet + wallet connect */}
        <div className="flex items-center gap-2">
          {account && (
            <>
              {usdcBalance !== null && (
                <span
                  className="font-mono tabular-nums hidden sm:block"
                  style={{ fontSize: "0.75rem", color: "var(--bone-800)" }}
                >
                  {usdcBalance} USDC
                </span>
              )}
              <button
                type="button"
                onClick={handleFaucet}
                disabled={faucetPending}
                className="btn-secondary"
                style={{
                  fontSize: "0.72rem",
                  padding: "4px 10px",
                  opacity: faucetPending ? 0.6 : 1,
                  cursor: faucetPending ? "not-allowed" : "pointer",
                }}
              >
                {faucetPending ? "Minting..." : "Get test USDC"}
              </button>
            </>
          )}
          <ConnectButton connectText="Connect Wallet" />
        </div>
      </div>
    </nav>
  );
}
