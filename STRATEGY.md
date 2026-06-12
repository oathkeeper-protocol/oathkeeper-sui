---
name: Oathkeeper
last_updated: 2026-06-11
---

# Oathkeeper Strategy

## Target problem

On-chain trading vaults and "verified trader" products let an operator post a track
record that's wash-traded, cherry-picked, or fabricated — and a depositor has no
trustless way to tell before their capital is at risk. The operator has a legitimate
reason not to just open their books (it leaks the strategy), so the naive fix — full
transparency — destroys the thing being funded. On Sui this can't even be patched at
the contract level after the fact: Move can't read historical events, so a contract
can't re-audit past fills at settlement.

## Our approach

Witnessing over reporting: the operator must trade *through* the oath contract, which
records DeepBook's own returned executed amounts and an on-chain `balance()` equity
anchor — never caller-supplied numbers. We then mark honestly what that proves:
drawdown-survival is wash-proof (the anchor is read from chain state, not reported);
the rest is witnessed-but-not-wash-proof. The honesty is the trust differentiator —
we make verifiability a first-class, on-chain property (WITNESSED vs SELF_REPORTED)
rather than overclaiming.

## Who it's for

**Primary:** The operator — an algo/AI trader running a strategy through an on-chain
vault. They're hiring Oathkeeper to *prove* real performance on DeepBook without
revealing the strategy, so depositors will trust them with capital.

**Secondary:** The depositor/doubter — a capital allocator who hires Oathkeeper to
judge an operator's real edge (and stake against it) before their money is at risk.

## Key metrics

_Judge-facing proof points for the Sui Overflow 2026 submission (DeFi & Payments track)._

- **Live witnessed oaths** — count of oaths minted at WITNESSED tier on testnet and
  mainnet. Measured on-chain.
- **Real DeepBook fills witnessed** — executed swaps routed through the contract whose
  amounts were captured from DeepBook's return, not self-reported. Measured on-chain.
- **Drawdown breach settled correctly** — at least one oath where a real equity-anchor
  breach triggers the on-chain Broken settlement, end to end. Binary, demoable.
- **Reconciler discrepancies flagged** — the open-source indexer correctly flags a
  fabricated/missing fill against the bound exec wallet's DeepBook history. Demoable.
- **Mainnet deployment** — package live on Sui mainnet (unlocks 100% of any prize
  upfront per the award split). Binary.

## Tracks

### Witnessed execution

The trustless core: `trade_via_deepbook` entry, on-chain equity anchor, WITNESSED/
SELF_REPORTED tier enforcement, drawdown-survival settlement.

_Why it serves the approach:_ This *is* witnessing-over-reporting — without it the
trust claim is just words.

### Reconciliation & dispute

The open-source deterministic indexer that diffs the bound exec wallet's DeepBook
history against on-chain attestations, plus the depositor dispute path.

_Why it serves the approach:_ Gives the depositor a second, independent check — trust
without re-introducing a trusted party.

### Demo & deploy surface

Testnet → mainnet deployment, the equity-curve frontend, and the one clean
operator-creates / depositor-doubts / breach-settles demo path.

_Why it serves the approach:_ A trust claim no one can see or run scores zero. This
track makes the approach legible to a judge in under five minutes.

## Milestones

- **2026-06-21** — Sui Overflow 2026 submission deadline (DeFi & Payments track).
- **2026-06 (pre-submission)** — Mainnet deploy, to claim 100% of any prize upfront
  rather than the 50/50 split.

## Not working on

- Multi-vertical (Uptime/Behavior/Validator/Treasury oaths) — cut to single-vertical
  trading for the sprint; enum stays as a roadmap signal.
- Live Hyperliquid cross-chain execution — the ecdsa_k1 signature proof-of-concept is
  enough for the roadmap; no live HL path.
- Seal/Walrus/DeepBook as headline features — they're plumbing, not the pitch. DeepBook spot execution is the witnessing venue (scores on the 20% Technical criterion); the DeFi & Payments "Trust-Minimized Finance" framing is the pitch.

## Marketing

**One-liner:** Oathkeeper turns a trading track record into something a depositor can
*verify* instead of *trust* — trust-minimized finance that enforces a performance
commitment programmatically, witnessed on-chain through DeepBook spot, without exposing
the strategy.

**Key message:** Anyone can claim a track record. Oathkeeper makes the operator trade
through the contract, captures DeepBook's own numbers, and anchors equity to chain
state — so drawdown-survival can't be faked, even by an operator wash-trading against
themselves. We mark exactly what's proven and what isn't. Honesty is the product.
