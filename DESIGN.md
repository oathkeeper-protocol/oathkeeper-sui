# DESIGN.md — Oathkeeper

> Design decisions and constraints. Updated as design evolves.
> This file documents WHAT we decided and WHY — not prescriptive tokens.

## Design lane

**Product**, not Brand. Design serves the task (browse oaths, stake, monitor, settle). Every visual choice must pass: "does this help the user do the thing faster or with more confidence?" If no, cut it.

## Open decisions (for Claude Design to resolve)

These are intentionally left open. The designer should make opinionated choices based on the audience described in PRODUCT.md, not fall back to AI defaults.

### Color
- Needs to support 5 semantically distinct roles without using the AI purple/cyan/gold palette
- Needs clear success/danger states for Kept/Broken outcomes
- Needs to work at small badge scale AND full-page scale
- Dark vs light: decide based on the actual use case (operators monitoring during market hours), not as a safety pick

### Typography
- Needs a text face and a data/mono face (two families minimum)
- The text face should NOT be Inter, Geist, Space Grotesk, Roboto, or Plus Jakarta Sans (Impeccable overused-font rule)
- The data face should handle tabular numbers well (amounts, addresses, timestamps)
- Body text 14-16px range. Monospace data can go smaller (12-13px)

### Layout
- Left-align body text (not centered)
- The marketplace card grid is the most-viewed surface — invest design time here
- Detail page is two-column on desktop, stacked on mobile
- Avoid uniform spacing everywhere — vary rhythm between sections

### Motion
- Smooth deceleration only. No bounce, no elastic
- Real-time feed entries should animate in without being distracting
- Countdown timers are ambient — don't flash or pulse

## Locked decisions

### Information hierarchy per screen

**Marketplace card — reading order:**
1. Operator identity (address + Standing) — WHO is making this promise
2. Bond size — HOW MUCH is at stake
3. Market sentiment (Believer/Doubter ratio) — WHAT does the crowd think
4. SLA dimensions — WHAT exactly was promised
5. Time remaining — WHEN does this resolve
6. Actions (Believe / Doubt) — WHAT can I do

**Oath detail — reading order:**
1. Status + countdown — IS this still active
2. Dimension progress — IS the operator on track
3. Stake panel — CAN I participate
4. Attestation feed — WHAT is happening right now
5. Staker list — WHO else is in

**Settlement — reading order:**
1. Outcome (Kept/Broken + reason) — WHAT happened
2. Money flow diagram — WHERE does every dollar go
3. Conservation check — DOES it add up (trust signal)
4. Action button — CAN I claim / settle

### Data display conventions
- USDC amounts: monospace, comma-separated, 2 decimal places for sub-dollar, 0 for whole numbers
- Addresses: first 4 + last 4 hex chars, copy button, explorer link on hover
- Timestamps: relative ("3h ago") in feeds, absolute ("Jun 14, 14:32") in tables
- Percentages: one decimal place max (e.g., "7.5%" not "7.50%")
- BPS dimensions: display as percentages to users (2000 bps → "20%")

### What NOT to show
- Contract code or Move module names (users don't care)
- Internal IDs or debug state
- Disabled buttons for actions that aren't possible yet — just don't render them
- "Powered by" badges for Walrus/Seal/DeepBook (plumbing, not features)

## Settlement money flow — the key visual

The settlement flow visualization is the single most important non-standard UI element. It must communicate:

**Kept outcome:**
```
                     ┌→ Oathkeeper (bond returned)
Bond ────────────────┘
                     ┌→ Platform (10%)
Doubter stakes ──────┼→ Oathkeeper (20%)
                     └→ Believers (70%, pro-rata)

Believer stakes ─────→ Returned
```

**Broken outcome:**
```
         ┌→ Client (claim amount)
Bond ────┤
         └→ Platform (residual)

                      ┌→ Platform (10%)
Believer stakes ──────┼→ Client (20%)
                      └→ Doubters (70%, pro-rata)

Doubter stakes ──────→ Returned
```

This should be a real visual diagram, not ASCII art. A Sankey-style flow, or a simple directed graph. The conservation line (total in = total out) appears below.

## Component notes

- **Standing indicator:** W/L history of the operator's past oaths. Could be dots, a mini bar chart, or a simple ratio. Must be readable at card-grid scale (≤24px height)
- **Believer/Doubter ratio bar:** single horizontal bar showing relative pool sizes. The most-glanced element on every card. Must update in real time
- **Dimension gauges:** 4 progress indicators for drawdown/trades/PnL/volume. These are functional instruments, not decorative charts. If a dimension has min_volume = 0, hide that gauge entirely
- **Attestation feed rows:** dense, tabular, reverse-chronological. Each row is one trade fill. Must link to Sui Explorer. This should feel like a log, not a card list
