# Oathkeeper — Design System & Claude Design Brief

> Feed this entire document to Claude Design. It contains everything needed to design the landing page and market app screens without additional context.

---

## What Oathkeeper Is

Oathkeeper is **onchain SLA infrastructure** built on Sui. Operators bond capital against service promises, clients register SLA claims against that bond, open markets price operator reliability in real time, and settlement is automatic with zero arbitration.

**Category:** Not a prediction market. Not insurance. Not copy-trading. It's a **commitment market substrate** — anywhere an opaque actor needs to make a credible claim about their own future behavior, an oath can be minted, bonded, doubted, believed, and settled.

**One-liner for the hero:** "Bond the outcome. Keep the work private. Settlement is automatic."

**Tagline:** "Onchain SLA infrastructure for operators who can't afford to be disbelieved."

---

## The Five Roles

| Role | Color intent | What they do | Capital at risk |
|------|-------------|--------------|-----------------|
| **Oathkeeper** (operator) | Gold / amber | Posts a USDC bond + multi-dimensional SLA commitment | Entire bond on breach |
| **Client** (counterparty) | Teal / cyan | Receives the service. Registers a claim against the bond. Doesn't stake capital. | Nothing — they're the beneficiary |
| **Believer** (supporter) | Green | Stakes FOR the operator. Earns from Doubter stakes on Kept. | Entire stake on breach |
| **Doubter** (skeptic) | Red / crimson | Stakes AGAINST the operator. Earns from Believer stakes on Broken. | Entire stake on kept |
| **Platform** | Neutral / gray | The protocol itself. Earns 10% of loser stakes on every settlement. | None — fee-only |

---

## Economics at a Glance (for visual diagrams)

### If Oath Kept (operator delivered):
```
Bond (10,000) ──────────────────────→ Oathkeeper ✓

Doubter stakes (1,500):
  10% (150)  ───→ Platform
  20% (300)  ───→ Oathkeeper (premium income)
  70% (1,050) ──→ Believers (pro-rata)

Believer stakes (2,000) ────────────→ Returned to Believers
```

### If Oath Broken (operator failed):
```
Bond (10,000):
  Client claim (5,000) ─→ Client ✓
  Residual (5,000) ──────→ Platform (penalty)

Believer stakes (2,000):
  10% (200)  ───→ Platform
  20% (400)  ───→ Client (bonus compensation)
  70% (1,400) ──→ Doubters (pro-rata)

Doubter stakes (1,500) ─────────────→ Returned to Doubters
```

### Key number: 10/20/70 split on loser stakes. Always.

---

## Brand Identity

### Voice
- **Confident, not hype.** This is infrastructure, not a meme coin.
- **Technical clarity over marketing polish.** Judges and operators value precision.
- **Honest about depth.** "Three verticals at honest depths" is a design principle, not just copy.

### Visual register
- **Terminal meets fintech.** Think Bloomberg terminal aesthetic with modern web typography.
- **Data-dense but legible.** Polymarket card density, not Robinhood simplicity. Operators want information, not hand-holding.
- **Dark mode primary.** Light mode as secondary. The product runs during market hours — dark is the default.

### Color palette direction
| Token | Purpose | Suggested range |
|-------|---------|-----------------|
| `--bg-primary` | App background | Near-black: `#0a0a0f` to `#111118` |
| `--bg-card` | Card/panel surfaces | Dark gray: `#16161e` to `#1c1c28` |
| `--bg-elevated` | Modals, dropdowns | Slightly lighter: `#1e1e2a` |
| `--accent-gold` | Oathkeeper / bond / primary CTA | Warm gold: `#d4a843` to `#f0c45a` |
| `--accent-green` | Believer / success / Kept status | Muted green: `#2ea043` to `#3fb950` |
| `--accent-red` | Doubter / breach / Broken status | Muted crimson: `#da3633` to `#f85149` |
| `--accent-teal` | Client / SLA / secondary info | Cool teal: `#39c5cf` to `#58d5e0` |
| `--text-primary` | Body text | Off-white: `#e6e6eb` |
| `--text-secondary` | Labels, metadata | Muted: `#8b8b9e` |
| `--border` | Card borders, dividers | Subtle: `#2d2d3f` |

### Typography
- **Headings:** Inter or Geist — geometric, clean, readable at large and small sizes
- **Body:** Same family, regular weight
- **Monospace (data):** JetBrains Mono or Fira Code — for amounts, addresses, hashes
- **Scale:** 14px base, 1.5 line height. Dense but not cramped.

### Spacing system
- 4px base unit. Components use 8/12/16/24/32/48px.
- Cards: 16px internal padding, 8px gap between cards in grid.
- Sections: 48px vertical separation.

---

## Landing Page Design

### Purpose
Convert three audiences: (1) operators who want to bond, (2) market participants (Believers/Doubters) looking for yield, (3) hackathon judges evaluating the submission.

### Structure (scroll-down sections)

#### Section 1: Hero
- **Headline:** "Bond the outcome. Keep the work private."
- **Subline:** "Onchain SLA infrastructure where operators bond capital against promises, open markets price reliability, and settlement is automatic."
- **Two CTAs:** `Launch App →` (primary, gold) and `Read the Docs` (secondary, outlined)
- **Visual:** abstract visualization of the 10/20/70 split — a flowing Sankey-style diagram showing capital flowing from bond + stakes through settlement to the five roles. Animated subtly on scroll. Dark background with gold/green/red accent lines.
- **No screenshots of the app here.** The hero is conceptual, not product.

#### Section 2: The Problem (3 cards)
Three cards, side by side on desktop, stacked on mobile:

**Card 1 — "Show the work"**
- Icon: eye / reveal
- "Edge decays on contact. Strategy copied. Alpha front-run."
- Muted, crossed-out visual — this option is bad.

**Card 2 — "Hide the work"**
- Icon: lock / hidden
- "Claims are worthless. Indistinguishable from fraud."
- Same muted, crossed-out treatment.

**Card 3 — "Bond the outcome" (highlighted)**
- Icon: shield with checkmark / bond
- "Keep the work private. Make the promise publicly costly to fake."
- This card is elevated, gold-bordered, the "answer."

#### Section 3: How It Works (horizontal flow)
A step-by-step visual flow, left to right (or vertical on mobile):

1. **Operator bonds** → gold icon, "Posts USDC bond + SLA dimensions"
2. **Client registers** → teal icon, "Registers claim against the bond"
3. **Market prices** → green/red split, "Believers and Doubters stake freely"
4. **Performance tracked** → live ticker icon, "Trades attested on-chain in real time"
5. **Auto-settlement** → checkmark icon, "Permissionless. Deterministic. Zero arbitration."

Each step has a short label + one sentence. The whole section should feel like reading a protocol diagram, not marketing copy.

#### Section 4: The Five Roles
A 5-column layout (3+2 on mobile) showing each role:

For each role:
- **Icon** (distinct per role, uses the role's accent color)
- **Role name** (bold)
- **One sentence** ("Posts bond and earns Standing" / "Registers SLA claim, gets paid on breach" / etc.)
- **"Earns from"** line (e.g., "Earns: 20% of Doubter stakes on Kept + bond return")
- **"Risks"** line (e.g., "Risks: entire bond on breach")

#### Section 5: Three Verticals
Show the three v1 verticals as proof of generalization:

| Vertical | "The work" (hidden) | "The outcome" (bonded) | Status badge |
|----------|--------------------|-----------------------|-------------|
| **AI Trading** | Strategy, signals | Drawdown, trades, PnL | `LIVE` (green) |
| **RPC Uptime** | Infrastructure | Uptime %, ping count | `LIVE` (green) |
| **AI Behavior** | Model weights | Behavior score | `MOCK` (amber) |

Two roadmap items shown dimmed: Validator Performance, Treasury Management.

#### Section 6: Built on Sui
Row of tech badges with brief context:
- **Sui Move** — "Native object model for bonded commitments"
- **Walrus** — "Encrypted oath text, verifiable blob storage"
- **Seal** — "Threshold encryption, on-chain access control"
- **DeepBook** — "First-class on-chain execution venue"

#### Section 7: Stats / Social Proof
Show real protocol stats (post-mainnet) or placeholder metrics:
- "X oaths minted" / "Y USDC bonded" / "Z settlements completed"
- "62 Move tests passing" / "Zero arbitration" (for hackathon judges)

#### Section 8: CTA Footer
- Repeat `Launch App →` + `View on GitHub` + `Read the Pitch`
- Sui Overflow 2026 badge
- "Oathkeeper. Onchain SLA infrastructure."

---

## App Screens Design

### Navigation
**Top bar:**
- Logo (left) — "Oathkeeper" wordmark + shield icon
- Nav links (center): `Marketplace` · `Mint` · `Portfolio`
- Wallet connect (right): show connected address truncated + balance

**No sidebar.** The app is focused enough for top-nav only.

### Screen 1: Marketplace (`/oaths`)

**Purpose:** Browse all active oaths. This is where Believers and Doubters find oaths to stake on.

**Layout:**
- **Filter bar** (top): tabs for `All` · `Trading` · `Uptime` · `Behavior`. Plus dropdowns for status (`Active` / `Settled`), sort (`Newest` / `Largest Bond` / `Most Staked` / `Nearest Settlement`).
- **Card grid** (3 columns desktop, 1 mobile). Each oath is a card.

**Oath Card anatomy:**
```
┌──────────────────────────────────────────┐
│ [Trading icon]  @0xA1...CE  ★★★☆☆       │  ← Oathkeeper addr + Standing
│                                          │
│ Bond: 10,000 USDC          3d 14h left   │  ← Bond size + countdown
│                                          │
│ ≤20% DD · ≥10 trades · ≥5% PnL          │  ← Dimensions as chips
│                                          │
│ Client claim: 5,000 USDC                 │  ← Client SLA amount
│                                          │
│ ┌─ Believers ──────── Doubters ────────┐ │
│ │ ██████████░░░░░░░░ │ ████░░░░░░░░░░ │ │  ← Stake bars (proportional)
│ │ 2,000 USDC         │ 1,500 USDC     │ │
│ └──────────────────────────────────────┘ │
│                                          │
│  [ Believe ↑ ]          [ Doubt ↓ ]      │  ← Two CTAs per card
└──────────────────────────────────────────┘
```

**Key visual elements:**
- The Believer/Doubter stake comparison bar is the attention anchor — shows the market's current sentiment at a glance.
- Countdown chip color-shifts from green → amber → red as it approaches zero.
- Cards for `Settled` oaths show outcome badge: `KEPT` (green) or `BROKEN (reason)` (red).
- Standing is shown as a star rating (simple) or W/L micro-timeline (advanced): ●●●○● = 3 kept, 1 broken, 1 kept.

**Empty state:** "No active oaths yet. Be the first to mint one." with CTA to `/mint`.

### Screen 2: Oath Detail (`/oaths/[id]`)

**Purpose:** Deep view for conviction building. Believers/Doubters decide whether to stake here. The Oathkeeper monitors their oath here.

**Two-column layout (desktop), stacked (mobile):**

**Left column — "The Commitment":**
- **Header strip:** Oathkeeper address + Standing + `ACTIVE` badge + countdown
- **Sealed oath text card:** shows Walrus blob ID + Seal lock icon. "Sealed via Seal. Only the bound exec wallet can decrypt."
- **Dimensions board — 4 gauges:**
  - **Drawdown gauge:** semicircle gauge, 0–100%. Current equity as a needle. Floor marked in red. If equity below floor, gauge glows red.
  - **Trade count:** horizontal progress bar `4 / 10`. Green if on pace, amber if behind.
  - **PnL bar:** signed bar centered at 0, floor at +5% marked. Current PnL annotated.
  - **Volume bar:** progress bar if applicable; hidden if min_volume = 0.
- **Bond & Client card:**
  - "Bond: 10,000 USDC" (large)
  - "Client: @0xC1...1E — Claim: 5,000 USDC"
  - Visual: bond as a solid bar, client_claim as a filled section within it, residual section labeled "Platform penalty on breach"

**Right column — "The Market":**
- **Stake panel (top priority):**
  ```
  ┌─────────────────────────────────┐
  │  I believe / I doubt            │  ← Toggle between two stake modes
  │                                 │
  │  Amount: [________] USDC        │  ← Free input, no ratio
  │                                 │
  │  If Kept:                       │
  │    You receive your stake back  │
  │    + pro-rata share of 70% of   │
  │    Doubter stakes               │
  │                                 │
  │  If Broken:                     │
  │    You lose your entire stake   │
  │    (10% Platform, 20% Client,   │
  │     70% to Doubters)            │
  │                                 │
  │  [ Stake → ]                    │
  └─────────────────────────────────┘
  ```
  The panel dynamically updates the "If Kept/If Broken" text based on which tab (Believe/Doubt) is active. Show estimated payout with current pool sizes.

- **Market sentiment bar:** horizontal bar showing Believer vs Doubter pool sizes. Animate when new stakes arrive.

- **Live attestation feed:** reverse-chronological list of `record_trade` events:
  ```
  12:34:05  BTC  +0.3%  $105,200  2,000 notional  [tx: 0xab..cd →]
  12:33:41  ETH  -0.1%  $104,800  1,500 notional  [tx: 0xef..12 →]
  ```
  Each row links to Sui Explorer. This feed should feel LIVE — new rows slide in from the top.

- **Stakers list:** two tabs — `Believers (5)` · `Doubters (3)`. Each row: address, stake amount, position ID. Clickable to Sui Explorer.

**Permissionless action bar (sticky bottom on mobile):**
- If `current_equity < drawdown_floor`: red glowing `Mark Breach` button
- If `now > epoch_end_ms`: amber glowing `Settle Epoch` button
- Both are permissionless — any wallet can trigger. Tooltip: "Anyone can trigger this. Gas ≈ 0.001 SUI."

**Settled state:**
- Status badge flips to `KEPT` or `BROKEN (reason)`
- Stake panel becomes `Claim Payout →` button (if connected wallet has a position)
- Feed becomes archive (no live updates)
- Winner/loser positions annotated with their actual payout amounts

### Screen 3: Mint Oath (`/oaths/new`)

**Purpose:** Create a new SLA in under 10 seconds. Aggressive defaults.

**Single column form, mobile-first:**

1. **Vertical picker:** Three tiles — `Trading` (default, gold border), `Uptime`, `Behavior`. Validator/Treasury shown disabled with "Coming soon" badges.

2. **Oath text:** Textarea, 280 char max, with character counter. Below: "Sealed via Seal. Stored on Walrus."

3. **Client:** Address input + claim amount input. "Who are you making this promise to, and how much do they get if you break it?"

4. **Dimensions:** For TradingOath, four sliders + numeric inputs:
   - Max drawdown % (default 20%, range 1-50%)
   - Min trades (default 10, minimum 1 — tooltip explains dead-trader defense)
   - Min PnL % (default 5%, range 0-100%)
   - Min volume USDC (default 0 = no floor)

5. **Scope:** Venue radio (DeepBook default), allowed assets multi-select (BTC, ETH, etc.), epoch duration presets (24h / 3d / 7d / 30d / custom)

6. **Bond:** USDC amount with quick chips (100, 1k, 10k, max). Show USDC balance. Below: "Your entire bond is at risk if the oath breaks. Residual above client claim goes to Platform."

7. **Submit:** `Mint Oath →` button. Progress strip on click: "Sealing → Uploading to Walrus → Reserving scope → Binding exec → Sharing oath"

### Screen 4: Portfolio (`/portfolio`)

**Purpose:** Per-role dashboard. Shows what the connected wallet has at stake.

**Three tabs across top:** `As Oathkeeper` · `As Believer/Doubter` · `History`

**Oathkeeper tab:**
- **Standing track record** at top — last N oaths as W/L timeline with aggregate stats
- **Active oaths:** compact cards with countdown + dimension progress
- **Total bonded / total earned / total lost** summary stats

**Believer/Doubter tab:**
- **Active positions:** cards showing the oath, your stake, current market sentiment
- **Claimable positions:** oaths that have settled where you haven't claimed yet. `Claim →` button inline.
- **Stats:** total staked, total won, total lost, win rate

**History tab:**
- Table: date, oath ID, role (Oathkeeper/Believer/Doubter), vertical, outcome, amount in/out, net P&L
- Filterable by role and outcome

### Screen 5: Settlement Modal

When anyone clicks `Settle Epoch` on an expired oath, a modal opens:

```
┌─────────────────────────────────────────────────┐
│  Settlement Preview                              │
│                                                  │
│  Outcome: BROKEN — insufficient trades (4/10)    │
│                                                  │
│  ┌─ Money Flow ──────────────────────────────┐   │
│  │                                            │   │
│  │  Bond (10,000)                             │   │
│  │    → Client claim: 5,000                   │   │
│  │    → Platform residual: 5,000              │   │
│  │                                            │   │
│  │  Believer stakes (2,000) — LOST            │   │
│  │    → Platform 10%: 200                     │   │
│  │    → Client 20%: 400                       │   │
│  │    → Doubters 70%: 1,400                   │   │
│  │                                            │   │
│  │  Doubter stakes (1,500) — RETURNED         │   │
│  │    + winnings: 1,400 (pro-rata)            │   │
│  │                                            │   │
│  │  ─────────────────────────────             │   │
│  │  Total in:  13,500  =  Total out: 13,500   │   │
│  │  Conservation: ✓                           │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  [ Settle (any wallet pays gas, ~0.001 SUI) → ]  │
│                                                  │
│  Settlement is permissionless. Anyone can         │
│  trigger this.                                    │
└──────────────────────────────────────────────────┘
```

The conservation check (`Total in = Total out`) is a design feature, not just math. **Show it prominently.** It's a credibility signal.

---

## Component Inventory (for design system)

### Atoms
- **Button:** primary (gold fill), secondary (outlined), danger (red), ghost (text only)
- **Badge:** status (`ACTIVE` blue, `KEPT` green, `BROKEN` red, `SETTLED` gray), vertical (`Trading`, `Uptime`, `Behavior`), role (`Oathkeeper`, `Client`, `Believer`, `Doubter`)
- **Input:** text, number (with stepper), address (with copy + explorer link), slider
- **Chip:** dimension chip (`≤20% DD`), countdown chip, asset tag (`BTC`, `ETH`)
- **Address:** truncated with copy + explorer link hover
- **Amount:** monospace, USDC-denominated, with comma separators

### Molecules
- **Oath Card:** see Marketplace card anatomy above
- **Dimension Gauge:** drawdown semicircle, progress bar, signed PnL bar
- **Stake Panel:** believe/doubt toggle, amount input, estimated payout, submit
- **Market Sentiment Bar:** horizontal Believer vs Doubter proportional bar
- **Standing Badge:** W/L micro-timeline or star rating
- **Attestation Row:** timestamp, asset, pnl, equity, tx link
- **Money Flow Diagram:** Sankey-lite showing settlement distribution

### Organisms
- **Top Nav:** logo + links + wallet
- **Oath Detail Left Column:** commitment info + dimensions + bond
- **Oath Detail Right Column:** stake panel + feed + stakers
- **Portfolio Tab Panel:** per-role dashboard content
- **Settlement Modal:** outcome + flow diagram + confirm

---

## Interaction Patterns

### Real-time updates
- Attestation feed: WebSocket push, new rows animate in from top
- Market sentiment bar: animate width changes on new stake events
- Dimension gauges: smooth transition on equity/trade-count updates
- Countdown chips: update every second in the last hour

### Permissionless actions
- `Mark Breach` and `Settle Epoch` buttons appear ONLY when the action is valid (equity below floor / epoch ended). Never show disabled versions — that confuses users about when they CAN act.
- Both buttons have a "glow" animation when active to attract attention.

### Wallet-aware rendering
- Before connect: show all data read-only. "Connect wallet" CTA on stake panel.
- After connect: stake panel is live. Portfolio populates. "Your position" highlights on oath detail if you have a stake.
- Multi-role: if the connected wallet is both an Oathkeeper AND a Believer on the same oath, show both perspectives without switching.

---

## Visual Anti-Patterns — DO NOT

- ❌ **No "green = good, red = bad" for outcomes.** A Broken oath is a market event, not a UX failure. Use neutral language ("Broken" not "Failed"; "Kept" not "Won").
- ❌ **No emojis anywhere.** This is infrastructure, not a consumer app.
- ❌ **No animations longer than 300ms.** Snappy transitions, not flourishes.
- ❌ **No hidden conservation math.** The settlement modal SHOWS that inflows = outflows. This is a trust signal.
- ❌ **No prediction-market language.** Not "bet", not "wager", not "odds". Use "stake", "bond", "claim".
- ❌ **No marketing fluff in the app.** The landing page can sell; the app should inform. Data density over persuasion.
- ❌ **No light-mode-only designs.** Dark mode is primary. If light mode exists, it's secondary.
- ❌ **No rounded-corner-everything.** Use `border-radius: 8px` for cards, `4px` for buttons and inputs, `2px` for badges. Not `16px` everywhere.

---

## Reference Inspirations

- **Polymarket** — card density, market sentiment display, data-first mobile
- **Hyperliquid** — trading terminal aesthetic, dark mode, monospace data
- **Dune Analytics** — dashboard layout, query-driven data surfaces
- **Linear** — clean navigation, minimal chrome, fast interaction
- **Bloomberg Terminal** — information density as a feature, not a bug

---

## File Handoff

After Claude Design produces the visual baseline, implementation goes into:
```
frontend/
  app/
    page.tsx                    # Landing
    oaths/page.tsx              # Marketplace
    oaths/new/page.tsx          # Mint
    oaths/[id]/page.tsx         # Detail
    portfolio/page.tsx          # Portfolio
  components/
    cards/OathCard.tsx
    cards/StandingBadge.tsx
    gauges/DrawdownGauge.tsx
    gauges/DimensionProgress.tsx
    feed/AttestationFeed.tsx
    panels/StakePanel.tsx
    panels/SettleModal.tsx
    panels/MarketSentiment.tsx
  lib/
    sui/                        # SDK client, PTB builders
    walrus/                     # Blob read/write
    seal/                       # Decrypt-if-bound
```

**Tech stack:** Next.js 14 (app router), Tailwind CSS, `@mysten/dapp-kit` for wallet connect, `@mysten/sui` for RPC.

---

*This document is the single source of truth for visual design. When in doubt, refer back to the role table, the economics diagram, and the anti-patterns list.*
