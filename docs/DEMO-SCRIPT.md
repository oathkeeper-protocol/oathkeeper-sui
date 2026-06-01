# Demo Script -- Oathkeeper-Sui

> 5 minutes max, 7 shots, judge-optimized.
> App is live on Sui testnet. Package: 0xa4c2f835f0abf70cf6ba095d7244a1ca8c8a1df7189b6a692517e32727ee267d
> Lead with the user and the pain. Architecture goes last.

## Opening line (memorize)

> "You want exposure to an anon AI trader's edge -- but they won't show you their strategy, and you can't tell a rug from real alpha. Their client has no on-chain recourse if the strategy blows up. Oathkeeper resolves both halves."

---

## Shot 1 (25s) -- The dilemma

Pain frame. No contracts. No jargon.

- Twitter screenshot of an anon trader with track-record claims
- Voiceover: every AI trader sits on a horn. Reveal strategy and alpha decays. Hide strategy and you cannot tell a rug from real edge. Client has no on-chain recourse if the trader blows up.
- Oathkeeper: a programmable conditional-settlement layer. Capital that moves automatically when an on-chain condition is verified. Zero arbitration.

---

## Shot 2 (25s) -- Five roles and the 10/20/70 split

Mechanism in 25 seconds. Do not rush; this is the one thing judges need to internalize before the live demo matters.

- **Oathkeeper** posts a USDC bond + multi-dim oath (drawdown, trades, PnL, volume). Bonds 10,000 USDC.
- **Client** registers a claim against the bond. Pays nothing. Gets automatic on-chain recourse on breach.
- **Believer** stakes FOR the Oathkeeper. Earns 70% of Doubter pool if Kept.
- **Doubter** stakes AGAINST. Earns 70% of Believer pool if Broken.
- **Platform** takes 10% of loser stakes on every settled oath. Explicit, disclosed, zero-knowledge-free.

Settlement split graphic: 10% Platform / 20% secondary / 70% winners. Two outcomes:

- Kept: secondary = Oathkeeper, losers = Doubters. Testnet result: oathkeeper +300, believer +1050, doubter -1500, platform +150, client 0. Net = 0.
- Broken: bond claim goes to Client + residual to Platform, secondary = Client, losers = Believers. Testnet result: client +5400, platform +5200, doubter +1400, believer -2000, oathkeeper -10000. Net = 0.

"Conservation proven on-chain. Total in equals total out, both outcomes, no ifs."

---

## Shot 3 (35s) -- Live mint: one PTB, one atomic bind

This is the technical centerpiece of the mint flow.

- Open the mint form (`/oaths/new`). Write the oath text, set the four dimensions, set epoch to the 2-minute demo preset.
- Click Mint. Show the single transaction on Sui Explorer.
- Highlight what the PTB contains: `new_dimensions` + `new_scope` + `start_epoch` (returns a zero-ability `ScopeReservation` hot potato) + `bind_exec_wallet`. All four in one transaction. The hot potato forces completion -- if `bind_exec_wallet` is absent, the PTB fails at the type-system level.
- Voiceover: "The exec wallet is now bound on-chain. No separate setup tx. No lock-then-fail window. One PTB, one signature, done."

---

## Shot 4 (35s) -- Faucet, then Believer and Doubter stake + sentiment chart

- Switch to a funded wallet (use the permissionless USDC faucet: one click, testnet USDC arrives in seconds -- show this).
- Open the live oath from the Browse page.
- One wallet stakes FOR (Believer). One stakes AGAINST (Doubter).
- Show the Polymarket-style sentiment chart updating in real time: Believer share of the pool shifts as each stake lands.
- Voiceover: "Anyone can stake. No whitelist. The chart is live market sentiment on this operator's reliability."

---

## Shot 5 (40s) -- record_trade by the bound exec wallet + live gauges

- The exec wallet (the bound address from Shot 3) calls `record_trade` on the live oath.
- Each attestation is an on-chain object. Show one on Sui Explorer: timestamp, trade details, caller = bound exec address.
- The UI equity curve and trade-count gauge update from live chain events.
- Voiceover: "Only the bound exec wallet can call record_trade. The signature check is enforced in Move -- not a UI guard, not an API key."

---

## Shot 6 (50s) -- settle_epoch: sum-zero distribution on Explorer (the centerpiece)

This is the payoff moment. Use a 2-minute demo-epoch oath that has already run to completion (or run one live if timing allows).

**Sub-shot A (25s) -- mid-epoch breach (drawdown):**

- Equity drops through the drawdown ceiling.
- `mark_breach()` button appears. Click it from a passerby wallet (not the Oathkeeper or Client -- anyone can call it).
- Status flips to Broken. Reason: drawdown.
- Voiceover: "Permissionless. No admin. No multisig. The breach condition is evaluated against on-chain state."

**Sub-shot B (25s) -- full settlement on Explorer:**

- Open a settled oath (use the pre-run Kept scenario or let the 2-min epoch expire).
- Call `settle_epoch()`. Show the resulting transaction on Sui Explorer.
- Each balance change is visible: oathkeeper, believer, doubter, platform, client. Five rows. They sum to zero.
- `claim_payout()` -- Believer and Oathkeeper each claim from the settled oath.
- Voiceover: "This is the product. Programmable conditional settlement. Capital moves automatically. No arbitration. Conservation holds on-chain."

---

## Shot 7 (30s) -- Roadmap card + close

Do not show staged footage for unshipped features. This shot is a slide, not a live demo.

**Roadmap integrations (10s slide):**

- Walrus: encrypted oath-text blob storage (sealed_oath_text_root is currently an opaque arg)
- Seal: t-of-n access control for authorized runtime decrypt
- DeepBook V3: live on-chain order execution as TradingOath attestation source
- UptimeOath + BehaviorOath: attestation adapters post-hackathon (enum and mint gate are live today)

"Each of these is a one-PR addition to a live, tested, conserved-on-chain core."

**Close (20s):**

- Return to the Browse page with real oaths on testnet.
- Voiceover: "Oathkeeper. Programmable conditional settlement for any bonded commitment. Trading is what we shipped end-to-end. Uptime and Behavior are next. Live on Sui testnet. Package 0xa4c2f835...ee267d."
- Close on: domain, testnet explorer link, GitHub.

---

## What NOT to show

- The contract source code
- Walrus blob upload or download (roadmap)
- Seal encrypt/decrypt flow (roadmap)
- Real DeepBook order placement (roadmap)
- A live uptime prober feed (roadmap)
- Any shot implying mainnet deploy (scheduled Day 25, not yet done)
- "Powered by Move" without context

---

## Recording prep

- Pre-fund 3 wallets: Oathkeeper wallet, Believer wallet, Doubter/passerby wallet
- Pre-mint at least one Kept oath and one Broken (drawdown) oath using the 2-minute demo-epoch preset, so Shot 6 sub-shot B has a settled result ready
- Use the permissionless USDC faucet for all wallets -- show it once in Shot 4
- Browser: zoom 125%, no extensions, clean profile, 1920x1080
- Have Sui Explorer open for: the mint PTB (Shot 3), a record_trade object (Shot 5), and the settled distribution tx (Shot 6)
- Do not warm a DeepBook orderbook -- record_trade is exec-wallet attestation, not live order flow
