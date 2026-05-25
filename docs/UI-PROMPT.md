# Oathkeeper Market UI — Design Prompt

> A self-contained brief for a frontend agent (or designer) to build the **market** side
> of Oathkeeper. The landing page is ~70% done in Claude Design — reuse its components,
> tokens, and visual language. This document covers everything past the landing.

## TL;DR for the agent

Oathkeeper is a commitment market. Three roles interact: **Oathkeeper** (commits +
bonds), **Doubter** (stakes against the commitment), **LP** (provides pool liquidity).
The market has three core screens: **Browse**, **Oath Detail**, **Portfolio**. Two
flows: **Mint Oath**, **Stake as Doubter**. One ambient surface: the settle button on
every active-but-expired oath, which is permissionless.

Reuse the landing page's typography, color palette, button styles, and "verifiable
opacity" hero language. Build the market in the same visual register.

## Brand vocabulary (use these exact words)

| Word | Meaning | Don't say |
|------|---------|-----------|
| Oath | The commitment object | Promise, bet, policy, insurance |
| Oathkeeper | User role that posts the bond | Trader, promiser, gambler |
| Doubter | User role that stakes against | Challenger, allocator, insurer |
| Bond | Oathkeeper's principal capital | Collateral, escrow, deposit |
| Stake | Doubter's smaller wager (12.5% of claim) | Premium (legacy), bet, fee |
| Claim | What a Doubter wins on breach | Payout, jackpot |
| Standing | An Oathkeeper's on-chain track record | Score, rating, reputation |
| Kept / Broken | The two settlement outcomes | Won / lost, success / failure |
| Verifiable opacity | Category-level positioning | "Prediction market", "insurance" |

## Role lens — design for one at a time, switch via context

The same data has different *importance* depending on which role is looking. The UI
should make role-switching cheap (sidebar nav: Browse · Mint · Doubt · LP · Portfolio).

### Oathkeeper (the committer)
- Wants to see: their own Standing graph, active oaths, settlement countdown, doubters'
  pressure (how much claim has been opened against the bond)
- Worries about: drawdown distance from floor, trade-count progress vs. minimum,
  epoch_end timer
- Mints rarely (one or two oaths per epoch), reads dashboard often

### Doubter (the skeptic)
- Wants to see: list of oaths sorted by their *doubter-side EV* (high open claims =
  spicy, low Standing oathkeepers = soft targets)
- Worries about: stake-vs-claim ratio (fixed 12.5%), bond coverage headroom (can't
  doubt more than `bond_value - open_claims`)
- Browses frequently, stakes selectively

### LP (the underwriter)
- Wants to see: pool reserves, share price, cumulative premiums earned, breach
  residuals absorbed
- Worries about: yield over time, settlement-volume forecast (more oaths = more
  potential premium income)
- Deposits/redeems occasionally, monitors passively

## Core screens

### 1. Marketplace browse (`/oaths`)

**Purpose:** the spicy, browseable surface — what brings doubters back daily.

**Layout intent:**
- Hero row: 3 tabs across the top — `Trading` · `Uptime` · `Behavior` (mirror the
  three v1 verticals, default to Trading)
- Filter rail (left, collapsible on mobile): status (Active / Broken / Settled),
  vertical, epoch duration, sort (newest / largest bond / most doubted / nearest
  settlement)
- Card grid (3 cols desktop, 1 col mobile). Each card shows:
  - Oathkeeper's address (short, with copy button) + Standing badge (W-L-W-W-L style
    micro-timeline of last 5 oaths) — clickable to filter by that Oathkeeper
  - The oath's vertical icon
  - The 4 dimensions (Trading) as compact stat row: `≤20% DD · ≥10 trades · ≥5% PnL ·
    BTC,ETH`
  - Bond size (big number, USDC)
  - **Doubt pressure bar** — visual fill of `open_claims / bond` (0% empty, 100%
    saturated). The card's most attention-grabbing element.
  - Time remaining (countdown chip, color-shifts as it nears zero)
  - One CTA: `Doubt this →` for Active; `Claim payout →` for Settled-with-position;
    `Mark breach →` for Active-with-current-equity-below-floor (rare, dramatic)

**Information density:** high but legible. Think Polymarket card density, not Robinhood.
**Empty state:** a CTA to mint the first oath of the vertical. Don't show "no results"
without a path forward.
**Liveness:** WebSocket / event-stream updates push new attestation pings and equity
changes into cards in real time. Doubt pressure bars animate when claims are opened.

### 2. Oath detail (`/oaths/[id]`)

**Purpose:** the conviction-builder. Doubters and onlookers come here to decide
whether to stake. Oathkeepers come here to monitor their own oath. The mark-breach
button lives here. The settle button lives here.

**Layout intent:** two-column on desktop, stacked on mobile.

**Left column (the commitment):**
- Title strip: Oathkeeper address + Standing W-L timeline, "Active" badge with epoch
  countdown
- The oath text card — short prose statement (decrypted only if the viewer is the
  bound exec_addr; otherwise shows the **Walrus blob ID** + Seal lock icon with
  tooltip "Sealed. Only the bound exec wallet can decrypt — verified by Seal access
  policy on-chain.")
- The 4 dimensions as a progress board:
  - **Drawdown**: gauge from starting equity, floor marked in red. Current equity
    annotated as a live needle.
  - **Trades**: progress bar `4 / 10`. Color = green if on pace, amber if behind.
  - **PnL**: signed bar centered at zero, floor at +5% marked.
  - **Volume**: progress bar if `min_volume_usdc > 0`; otherwise hide this gauge
    (don't show inactive dimensions).
- Bond box: `10,000 USDC bonded` with a sub-row showing `open_claims` filled against
  `bond` (same doubt pressure visual as the card)

**Right column (the doubter side):**
- **Stake panel** (Doubter mints here):
  - Input: "I claim..." [_____] USDC
  - Auto-computed: "...by staking 12.5% (= X USDC)"
  - Coverage hint: "Bond headroom: Y USDC remaining"
  - Big button: `Stake against`
  - Beneath: a one-liner: "If broken: you receive X + Y. If kept: you forfeit Y to
    Oathkeeper (60%) and LP (40%)."
- **Live attestation feed** below: each `record_trade` event as a row — venue tx hash
  (link to Sui Explorer), asset, signed pnl delta, equity after, timestamp. Reverse
  chronological. Should feel like a live tape — Polymarket order book vibe.
- **Doubters list**: addresses, stake amounts, claim amounts, with paginate. A small
  red flame icon next to the highest-claim doubter.

**Permissionless action bar (bottom, sticky on mobile):**
- If `current_equity < drawdown_floor`: a glowing red `Mark breach` button. Anyone
  can click. Show the equity delta that triggers it.
- If `now > epoch_end_ms` and status != Settled: a glowing amber `Settle epoch`
  button. Anyone can click. Tooltip explains the conservation math.

**Settled state of this screen:**
- Status badge flips to either `Kept` (green) or `Broken` (red with reason chip:
  "drawdown" / "insufficient trades" / "insufficient PnL")
- Stake panel collapses; replaced with `Claim your payout` button if the connected
  wallet holds a `DoubterPosition` for this oath
- Live feed becomes archive feed (same data, no real-time updates)

### 3. Mint oath flow (`/oaths/new`)

**Purpose:** 6-second wager creation per CLAUDE.md UX goal. Aggressive defaults.

**Layout intent:** a single column form, mobile-first. No multi-step wizard.

**Sections (top to bottom):**
1. **Vertical picker** — three big tiles (Trading default, Uptime, Behavior).
   Validator/Treasury are visible but disabled with "Coming soon — enum-only in v1"
   labels (cheap roadmap signal).
2. **Oath text** — a textarea, max 280 chars, with character counter. Below it:
   "Sealed via Seal. Stored on Walrus. Only your bound exec wallet can decrypt."
3. **Dimensions** — for TradingOath, four sliders + numeric inputs:
   - Max drawdown (default 20%)
   - Min trades (default 10, hard min 1 — explain why in tooltip: "min_trades = 0
     would let an Oathkeeper bond and do nothing — protocol rejects it")
   - Min PnL (default 5%)
   - Min volume USDC (default 0 = no floor)
4. **Scope** — venue radio (DeepBook default for v1 demo; Hyperliquid shown,
   marked beta), allowed assets multi-select, epoch duration (24h / 3d / 7d / 30d
   presets + custom)
5. **Exec wallet** — connected wallet by default; "Use a different exec wallet"
   collapsible reveals a pubkey field. Show a small "Signature ready" indicator
   once the binding is signable.
6. **Bond** — USDC amount with quick chips (`100`, `1k`, `10k`, `max`). Show
   USDC balance, projected max upside (`0.075 × bond` on full doubting), projected
   max downside (`-bond` on breach). Don't soften this — judges will want to see we
   surface the trade-off.
7. **Submit** — single button: `Mint Oath`. On click: triggers two-step PTB
   (start_epoch → bind_exec_wallet) in one transaction. Show a real-time progress
   strip: "Sealing oath text → Uploading to Walrus → Reserving scope → Binding exec
   → Sharing oath."

**Validation:** all client-side validation must mirror Move asserts. If Move would
abort with `EMinTradesTooLow`, the form must catch it before submission and surface
the same error string.

### 4. Portfolio dashboards (`/portfolio`)

Three sub-tabs — `Oathkeeper`, `Doubter`, `LP` — visible based on what the wallet
holds. Empty tabs show a CTA back to Browse or Mint.

**Oathkeeper tab:**
- Standing track-record chart at top — last N oaths plotted as W/L tokens on a
  timeline, with running aggregate win rate and average bond size
- Active oaths section: cards (compact version of the marketplace card) with
  countdown + drawdown distance indicator
- Settled history: table — date, vertical, bond, outcome, premium earned (Kept) or
  bond lost (Broken)

**Doubter tab:**
- Active positions: cards showing the oath being doubted, current stake, claim, the
  live equity curve of the oath
- Settled positions: table — outcome, profit/loss per position, claim button if
  unclaimed
- Aggregate stats: total staked, total won, win rate as a doubter

**LP tab:**
- Pool reserves + share price chart over time
- User's share balance + USDC-equivalent value
- Cumulative income breakdown: premium income (40% of stakes on Kept) vs. residual
  income (bond residual on Broken with underclaiming)
- Deposit / Redeem actions in a card

### 5. Settle-time UI (not a separate page — modal triggered from Oath Detail)

When anyone clicks `Settle epoch` on an expired-but-active oath, show a modal:
- Pre-computed outcome (Kept / Broken with reason)
- Money flow diagram: bond → promiser (Kept) or bond → doubters + residual → LP
  (Broken)
- Conservation check: `inflows = outflows = X USDC`
- Confirm button: `Settle (any wallet pays gas)`
- A small text line: "Settlement is permissionless — anyone can trigger this. Gas is
  ~0.001 SUI."

## Visual elements that must exist

| Element | Where used | Notes |
|---------|------------|-------|
| **Standing timeline** | Card, detail, portfolio | W-L tokens with hover for oath detail |
| **Doubt pressure bar** | Card, detail | Fill = open_claims / bond. Animate on update. |
| **Drawdown gauge** | Detail | Floor highlighted red, current equity needle live |
| **Live attestation tape** | Detail | Polymarket-style scrolling event list |
| **Mark breach button** | Detail | Red, glowing only when actually breachable |
| **Settle button** | Detail | Amber, glowing only when epoch ended |
| **Conservation diagram** | Settle modal | Sankey-lite: inflows → outflows |
| **Sealed text card** | Detail | Lock icon + Walrus blob ID + Seal policy link |

## What to reuse from the existing Claude-Designed landing page

(Assumption: the landing exists with hero, dilemma section, and CTA blocks. Pull
forward into the market:)

- **Typography scale** — same heading sizes, same body type
- **Color tokens** — primary accent, success/danger semantics
- **Button system** — primary, secondary, ghost
- **Card chrome** — border-radius, shadow, hover transitions
- **"Verifiable opacity" framing** — show up in tooltips and empty states, not just on
  landing. The market reinforces the pitch with every interaction.

## Anti-patterns — do not

- ❌ Render a 4-dimension oath as a single "promise" string. The four-dim breakdown IS
  the anti-fraud mechanic. Show it explicitly.
- ❌ Color-code Oathkeeper outcomes with green-good / red-bad. A "Broken" oath isn't a
  user-facing failure — it's a market clearing event. Use neutral language ("Broken"
  not "Failed"; "Kept" not "Won").
- ❌ Hide the conservation math. Settlement modal should *show* that inflows = outflows.
  That's a credibility signal worth a click of attention.
- ❌ Show "earnings per oath" without context. Per CLAUDE.md, the Oathkeeper isn't
  optimizing per-oath EV — they're buying Standing. Surface Standing prominently in
  the portfolio dashboard so per-oath earnings sit in context.
- ❌ Build an alpha "predict the breach" leaderboard for Doubters in v1. It pulls the
  framing back toward "prediction market" — exactly the opposite of where we want
  judges to land.

## Out of scope for v1 — explicit non-goals

- Standing portability across wallets (Standing follows the address only)
- LP-share secondary market UI (LPShare is transferable but no UI surfaces this)
- Dispute UI for `dispute_attestation` (Week 3 Day 21 — ship a basic version then)
- Mobile native app (responsive web is enough for Sui Overflow)
- Multi-language i18n (English only for hackathon)

## Inputs the frontend needs from contracts (already shipped or coming)

| Surface | Contract source | Status |
|---------|-----------------|--------|
| List of all Oaths | Sui event stream — `OathMinted`, `OathSettled` | ✅ |
| Per-oath state | `Oath<USDC>` shared object reads | ✅ |
| Doubt positions | `DoubterPosition<USDC>` owned objects per wallet | ✅ |
| LP pool state | `LPPool<USDC>` shared object reads | ✅ |
| Standing history | Off-chain aggregator over `OathSettled` events | Week 2 |
| Sealed oath text | Walrus `readBlob(blobId)` | Week 2 |
| Live attestations | Sui event stream — `TradeAttested` | Day 6+ |
| Mark breach gate | `mark_breach` — current_equity vs. floor | ✅ |
| Settle gate | `settle_epoch` — now_ms vs. epoch_end_ms | ✅ |

## Demo path — what must work end-to-end for Shot 3-6 of DEMO-SCRIPT.md

1. `/oaths` browse loads, shows pre-minted Scenarios A/B/C/D as cards
2. Click into Scenario A → live attestation feed updates as agent fires trades
3. Mint flow from `/oaths/new` completes in <10 seconds (Walrus upload bottlenecks the
   demo if not pre-warmed — see DEMO-SCRIPT.md "Recording prep")
4. Doubter wallet stakes via right-column panel; doubt-pressure bar animates
5. Breach scenario triggers — red flash on the drawdown gauge, mark-breach button
   lights up, click resolves the status
6. Settle flow on Scenario D (dead-trader) — settle modal shows conservation, click
   confirms, payouts visible in next-tx wallet inspector

Get those six steps working and the demo recording goes smoothly.

## File layout suggestion (Next.js 14 app router)

```
frontend/
  app/
    page.tsx                       # landing (reuse Claude Design)
    oaths/
      page.tsx                     # Marketplace browse
      new/page.tsx                 # Mint flow
      [id]/page.tsx                # Oath detail
    portfolio/
      page.tsx                     # Three-tab dashboard
  components/
    cards/OathCard.tsx
    cards/StandingBadge.tsx
    gauges/DrawdownGauge.tsx
    gauges/DimensionProgress.tsx
    feed/AttestationFeed.tsx
    panels/StakePanel.tsx
    panels/MarkBreachAction.tsx
    panels/SettleModal.tsx
  lib/
    sui/                           # Sui client, PTB builders
    walrus/                        # Walrus SDK wrapper for sealed text
    seal/                          # Seal SDK wrapper for decrypt-if-bound
    aggregator/                    # Standing aggregation from events
```

That's the brief. Build it like a tight Polymarket competitor with the chrome of a
fintech terminal. Verifiable opacity in every tooltip. No emojis. No prediction-market
language. Conservation diagrams where it matters.
