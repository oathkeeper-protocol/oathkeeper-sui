# PRODUCT.md — Oathkeeper

> Context file for design tools. Describes who uses this, how it should feel, and what to avoid.

## What this is

Oathkeeper is onchain SLA infrastructure on Sui. Operators bond capital against service promises. Clients register claims. Open markets (Believers/Doubters) price operator reliability. Settlement is automatic — zero arbitration, zero human judges, zero dispute windows.

There are two surfaces:
1. **Landing page** — explains the product to operators, market participants, and hackathon judges
2. **Market app** — where oaths are browsed, minted, staked on, monitored, and settled

## Who uses this

### Primary: Operators (Oathkeepers)
- Anonymous AI traders, RPC providers, API operators, anyone running a service they want to make credibly verifiable
- Technically sophisticated. Comfortable with wallets, transactions, DeFi terminology
- They come here to BUILD reputation, not to browse. Their session is: mint an oath, monitor it, collect premium or lose the bond
- They care about: their track record (Standing), how much they're being doubted, whether they're on pace to meet their SLA dimensions

### Secondary: Market participants (Believers + Doubters)
- DeFi-native users who want yield from expressing a view on operator reliability
- Believers back operators they trust. Doubters bet against operators they suspect will fail
- They browse the marketplace like Polymarket — scanning for mispriced oaths
- They care about: current Believer/Doubter pool ratio (market sentiment), oath dimensions, countdown timers, their position P&L

### Tertiary: Clients
- The counterparty receiving the service. Registered at oath creation
- Doesn't stake capital. Gets paid from the bond if the operator fails
- Passive role in the UI — they mostly just check if their operator is on track

### Judges (hackathon context)
- Sui Overflow 2026 judges evaluating the submission
- They'll spend 3-5 minutes with the landing page and app
- They care about: does this solve a real problem (50% weight), is the UX clean (20%), is the tech real (20%), is the vision compelling (10%)
- They will NOT read documentation. The product must explain itself.

## Voice and register

### Tone
- **Infrastructure, not consumer.** This is plumbing for DeFi operators, not a retail app
- **Precise, not clever.** Say exactly what the settlement does. Don't soften numbers or use metaphors where a number works
- **Confident, not hyped.** No exclamation marks. No "revolutionary." The product is quietly consequential
- **Terse.** Every label earns its space. If a section heading and its first sentence say the same thing, delete the heading

### Language rules
- "Oath" not "promise" or "bet" or "policy"
- "Bond" not "collateral" or "deposit" or "escrow"
- "Stake" not "wager" or "bet"
- "Kept" and "Broken" not "Won/Lost" or "Success/Failure" — these are SLA outcomes, not game results
- "Settlement" not "payout" or "resolution"
- Never "prediction market" — structurally different product
- Never "AI-powered" or "intelligent" — the settlement is deterministic, not AI
- Amounts always in USDC with comma separators. Addresses truncated with copy button

### Information density
- **High.** Users are DeFi-native. They can read dense data. Don't spread 4 numbers across 4 cards when a table row works
- The marketplace should feel like scanning a Hyperliquid orderbook or a Bloomberg terminal, not browsing an NFT gallery
- Show the math. The settlement modal should display the conservation proof (total in = total out). This is a trust signal, not noise

## Anti-references — what this must NOT look like

Per Impeccable's slop catalog, explicitly avoid:

- **The AI color palette.** No purple-to-blue gradients. No cyan-on-dark neon. No gold-accent-on-dark as default
- **Glassmorphism.** No blur backgrounds, glass cards, glow borders as decoration
- **Side-tab accent borders.** The single most recognizable AI UI tell. Do not put a thick colored left-border on cards
- **Icon tile above heading.** No rounded-square icon containers stacked above feature headings
- **Cards wrapping everything.** Not every piece of content needs a bordered container
- **Nested cards.** Never cards inside cards
- **Everything centered.** Left-align body text. Asymmetric layouts feel more designed
- **Bounce/elastic easing.** Smooth deceleration only
- **Inter/Geist/Space Grotesk for everything.** These fonts are on so many AI-generated sites they're a tell. Pick something with character or pair deliberately
- **Single font for everything.** Use at least a text face and a data/mono face
- **Dark mode by default as a safety pick.** If dark mode is right for the audience, justify it from the use case, don't retreat into it
- **Monotonous spacing.** Vary rhythm. Not everything is 24px apart
- **Gradient text on headings.** Decorative, not meaningful
- **Sparklines as decoration.** If there's a chart, it must convey real information
- **Every button is primary.** Clear hierarchy: one primary action per view
- **Hero-metric-features template.** Big number, small label, three stats — trusted nowhere
- **Modals for everything.** Settlement could be inline, not a modal interrupting flow

## What good looks like (positive references)

- **Hyperliquid** — dense, functional, respects the user's expertise. Data is the interface
- **Linear** — minimal chrome, fast, keyboard-native. Nothing decorative exists without function
- **Stripe Dashboard** — clean hierarchy, great typography, information density without clutter
- **Dune Analytics** — data surfaces that earn their complexity
- **Bloomberg Terminal** — the extreme end of density. We don't need to go this far, but the SPIRIT — "information density is a feature" — is right

## The five roles and their colors

Don't pre-assign brand colors to roles. Instead, ensure the palette has enough semantic range to distinguish five roles visually without relying on purple/cyan/gold AI defaults. The roles and their emotional valence:

- **Oathkeeper** — authority, commitment, weight
- **Client** — beneficiary, protected, passive
- **Believer** — confidence, support, long
- **Doubter** — skepticism, challenge, short
- **Platform** — neutral, infrastructure, fee

These need to be distinguishable at card-grid scale (small badges) and at detail-page scale (full sections).

## Key screens (what to design)

### Landing page
- Must explain the product to someone who's never heard of it in under 60 seconds
- Opens with the problem, not the solution
- Shows the 5-role model visually
- Shows the settlement flow (where does money go)
- Shows three verticals (Trading, Uptime, Behavior) as proof of generalization
- Ends with a CTA into the app
- Must work for hackathon judges who have 3 minutes

### Marketplace (`/oaths`)
- Browse active oaths. Filter by vertical (Trading/Uptime/Behavior), status, sort
- Each oath shows: operator address + Standing, bond size, client claim, SLA dimensions, Believer/Doubter stake ratio, countdown
- Two actions per oath: Believe or Doubt

### Oath detail (`/oaths/[id]`)
- Full view of one oath: commitment dimensions with live progress, stake panel (believe or doubt), live attestation feed, staker list
- Permissionless action buttons: Mark Breach (if equity below floor), Settle Epoch (if time expired)
- After settlement: outcome badge, claim payout button, money flow breakdown

### Mint (`/oaths/new`)
- Create a new SLA. Form: vertical picker, oath text, client address + claim, dimensions, scope, bond amount
- Should be completable in under 10 seconds with good defaults

### Portfolio (`/portfolio`)
- Per-role dashboard: what the connected wallet has bonded, staked, or claimed
- Standing history for Oathkeepers, position P&L for Believers/Doubters

### Settlement flow
- When someone triggers settlement, show the money flow: where every dollar goes
- Show conservation (total in = total out) as a visible check
- This can be inline on the detail page, doesn't have to be a modal

## Technical constraints

- **Next.js 14** (app router) + Tailwind CSS
- **@mysten/dapp-kit** for Sui wallet connect
- **Must work on mobile.** Operators check their oaths on phones during market hours
- **Real-time updates** for attestation feed and stake changes (WebSocket or polling)
