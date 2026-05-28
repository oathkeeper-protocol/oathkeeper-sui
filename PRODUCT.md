# Product

## Register

product

## Users

### Primary: Operators (Oathkeepers)
Anonymous AI traders, RPC providers, API operators. Anyone running a service they want to make credibly verifiable without revealing how it works. Technically sophisticated; comfortable with wallets, transactions, DeFi terminology. They come here to build reputation (Standing), not to browse. Session: mint an oath, monitor dimensions, collect premium or lose the bond. They care about their track record, how much doubt they're attracting, whether they're on pace to meet their SLA.

### Secondary: Market participants (Believers + Doubters)
DeFi-native users who want yield from expressing a view on operator reliability. Believers back operators they trust; Doubters back against operators they think will fail. They browse the marketplace scanning for mispriced oaths. They care about: Believer/Doubter pool ratio, oath dimensions, countdown timers, position P&L.

### Tertiary: Clients
The counterparty receiving the service. Registered at oath creation. Doesn't stake capital; gets paid from the bond if the operator fails. Passive in the UI; they mostly check if their operator is on track.

### Hackathon judges (temporary audience)
Sui Overflow 2026 evaluators. 3-5 minutes with the landing page and app. They care about: real problem solved (50% weight), clean UX (20%), real tech (20%), compelling vision (10%). They will NOT read documentation. The product must explain itself.

## Product Purpose

Oathkeeper is onchain SLA infrastructure on Sui. Operators bond capital against service promises. Clients register SLA claims against that bond. Open markets (Believers/Doubters) price operator reliability in real time. Settlement is automatic: zero arbitration, zero human judges, zero dispute windows.

Five roles interact: Oathkeeper (bonds), Client (claims), Believer (stakes for), Doubter (stakes against), Platform (10% fee). Settlement splits loser stakes 10/20/70 across Platform, secondary beneficiary, and winners.

Two surfaces: (1) landing page that explains the product, (2) market app where oaths are browsed, minted, staked on, monitored, and settled.

## Brand Personality

**Infrastructure, not consumer.** This is plumbing for DeFi operators, not a retail app.

**Precise, not clever.** Say exactly what the settlement does. Don't soften numbers or use metaphors where a number works.

**Confident, not hyped.** No exclamation marks. No "revolutionary." The product is quietly consequential.

Three words: **precise, consequential, opaque.**

"Opaque" is deliberate: the product's core value proposition is verifiable opacity. The mechanism stays hidden; the outcome is public. The design should feel like it knows more than it shows.

### Language rules
- "Oath" not "promise," "bet," or "policy"
- "Bond" not "collateral," "deposit," or "escrow"
- "Stake" not "wager" or "bet"
- "Kept" and "Broken" not "Won/Lost" or "Success/Failure"
- "Settlement" not "payout" or "resolution"
- Never "prediction market." Structurally different product
- Never "AI-powered" or "intelligent." The settlement is deterministic
- Amounts in USDC with comma separators. Addresses truncated with copy button

### Information density
High. Users are DeFi-native. They can read dense data. Don't spread 4 numbers across 4 separate containers when a row works. The marketplace should feel like scanning a Hyperliquid orderbook, not browsing an NFT gallery. Show the settlement math; it's a trust signal, not noise.

## Anti-references

### Specific patterns to avoid (per Impeccable's slop catalog)
- Purple-to-blue gradients, cyan-on-dark neon, gold-accent-on-dark (the AI color palette)
- Blur backgrounds, glass cards, glow borders as decoration (glassmorphism)
- Thick colored left-border on cards (side-tab accent, the most recognizable AI tell)
- Rounded-square icon containers stacked above feature headings (icon tile above heading)
- Cards wrapping every content element. Nested cards
- Center-aligned body text everywhere
- Bounce/elastic easing
- Inter, Geist, Space Grotesk, Roboto, Plus Jakarta Sans as the sole typeface
- Single font for everything
- Dark mode chosen as a safety pick rather than from the use case
- Same spacing value everywhere (monotonous rhythm)
- Gradient text on headings
- Decorative sparklines that convey no data
- Every button styled as primary
- The big-number/small-label hero-metric template
- Modals as the default interaction for complex flows

### Category-reflex traps to avoid
- First-order: "crypto → neon on black." Oathkeeper is not a crypto bro product
- Second-order: "fintech-that-avoids-navy → terminal-native dark mode." Don't reflexively reach for the Bloomberg clone aesthetic just because we reference Bloomberg as an information-density inspiration. The density principle, not the color scheme

### What good looks like
- **Hyperliquid**: dense, functional, respects expertise. Data is the interface
- **Linear**: minimal chrome, fast, keyboard-native. Nothing decorative without function
- **Stripe Dashboard**: clean hierarchy, great typography, density without clutter
- **Dune Analytics**: data surfaces that earn their complexity

## Design Principles

1. **Information density is a feature.** Users are DeFi-native operators checking positions during market hours. Spread data thin and they'll switch to a terminal. Pack it dense and readable, and the product becomes the terminal.

2. **Show the math, not the magic.** The settlement conservation proof (total in = total out) is a UI element, not an implementation detail. When the product displays where every dollar goes, it earns trust that no "trust us" badge can match.

3. **Absent until valid.** If an action can't be taken right now, don't show a disabled button. Just don't render it. The Mark Breach button appears when equity breaches the floor. The Settle button appears when the epoch ends. Absent until valid, present when actionable.

4. **Outcomes, not judgments.** "Kept" and "Broken" are SLA resolution states, not moral judgments. The interface presents outcomes neutrally. A Broken oath is a market-clearing event; the Doubters earned their return. Don't color-code it as failure.

5. **Every word earns its space.** If a section heading and its first sentence say the same thing, delete the heading. If a tooltip restates the label, delete the tooltip. Terse is not hostile; terse is respectful of attention.

## Accessibility & Inclusion

- WCAG AA minimum (4.5:1 contrast for body text, 3:1 for large text and UI components)
- Reduced motion: all transitions respect `prefers-reduced-motion`
- Color blindness: role distinctions must not rely solely on hue; pair with shape, position, or label
- Keyboard navigation: all interactive elements reachable and operable without mouse
- Screen reader: semantic HTML, ARIA labels on custom controls, live regions for real-time feed updates
