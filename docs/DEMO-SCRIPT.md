# Demo Script — Oathkeeper-Sui

> ≤5 minutes, 7 shots, judge-optimized. Lead with the user and the pain. Architecture goes last.

## Opening line (memorize)

> *"You want exposure to an anon AI trader's edge — but they won't show you their strategy, and you can't tell a rug from real edge. Oathkeeper resolves both halves."*

## Shot 1 (25s) — The dilemma

Pain frame, no contracts, no jargon.

- Twitter screenshot of an anon trader with track record claims
- Voiceover: every AI trader sits on a horn: **reveal strategy → alpha decays**, or **hide strategy → can't tell rug from edge**
- Oathkeeper: a market for verifiable performance *without* revealed alpha

## Shot 2 (25s) — Three roles

Mechanism in 25 seconds.

- **Oathkeeper** writes a bonded oath (free text, multi-dim: drawdown ≤20%, ≥10 trades, ≥5% PnL). Bonds USDC.
- **Doubter** browses oaths, stakes against ones they think will break.
- **LP** underwrites pool float, earns from total wager volume.
- On kept oath: stake splits 60/40 Oathkeeper/LP. **The Oathkeeper earns from skeptics being wrong.**
- On broken oath: bond pays Doubters, residual sweeps to LPs. Oathkeeper gets zero.

## Shot 3 (35s) — Live demo: mint an Oath

- Open `/oaths/new`, write the oath text, set the 4 dimensions, click Mint
- Watch the encrypted oath upload to Walrus, see the merkle root commit on Sui Explorer
- Watch the exec wallet signature bind on-chain
- "Three primitives, one form: Walrus, Seal, Sui."

## Shot 4 (35s) — Doubter stakes

- Switch wallet. Open the freshly-minted oath.
- See the bond, the 4-dimension promise, the Oathkeeper's Standing track record.
- Stake 6.25 USDC against a 50 USDC claim (12.5% premium).
- Notice: contract reverts if `Σ open claims > bond` — invariant visible to the user.

## Shot 5 (50s) — Live fills + breach

- Agent runs the strategy, places real DeepBook orders.
- Equity curve updates in real time. Each tick has a clickable DeepBook tx hash.
- (Pre-scripted) trader busts through drawdown ceiling on a single bad fill.
- `mark_breach()` button lights up. Anyone (Doubter, LP, passerby) can click it.
- Status flips to Broken. Reason: drawdown.

## Shot 6 (45s) — Settle-time breach (Scenario D) — the dead-trader defense

- Open a different oath: trader never traded. Drawdown is fine — it never moved.
- But oath required ≥10 trades and ≥5% PnL.
- `settle_epoch()` triggers. Breach reasons: `insufficient_trades | underperformed`.
- Doubters get paid from bond anyway. *"You can't bond capital and do nothing on Oathkeeper. The oath has teeth."*

## Shot 7 (70s total) — Multi-vertical live + close

The roadmap-slide version of this shot is gone. Trading is the depth; this is the breadth proof. Both adapters are on-chain. Both demos are live (uptime real, behavior mock-but-honestly-labelled).

### 7a (30s) — RPC uptime, live attestation

- Cut to a new browser tab: an UptimeOath on `/oaths/[uptime-id]`.
- Oath tuple visible: `uptime ≥ 99.5% / min_pings ≥ 1000 / 7-day epoch`. Bond: 200 USDC. Doubters staked: 75 USDC claim notional.
- Live feed of signed prober reports streaming into the attestation table (timestamped, ed25519-signed by the prober's bound key).
- Pull up one prober receipt on Sui Explorer to show it's a real on-chain object, not a UI mock.
- Voiceover: *"Same Oath object. Same Doubter mechanism. Same settlement math. The only thing that changes is the attestation source — DeepBook fills for trading, signed prober pings for uptime."*

### 7b (10s) — AI agent behavior, contract-level support

- Cut to `/oaths/[behavior-id]`.
- Oath tuple: `behavior_score ≥ 9000/10000 across ≥ 20 judgments`. Bond: 50 USDC.
- Voiceover (terse): *"Behavior bonds. Judge-attested. The judge is mocked for this demo — but the contract dispatch is real. Swap the judge for an LLM jury and this ships."*
- Do not oversell. Naming the mock is the credibility move.

### 7c (30s) — Close

- Cut back to a clean closing card.
- *"Three verticals. One protocol. Trading is what we shipped end-to-end. Uptime is what we proved generalizes. Behavior is what unlocks next. Oathkeeper is the commitment-market substrate."*
- Close on: "Oathkeeper. Live on Sui mainnet. [URL]."

### Drop-if-cut behavior

If the UptimeOath adapter was dropped at the Day-17 gate, Shot 7a collapses to a 10s slide ("UptimeOath enum variant, prober shipping post-hackathon") and Shot 7c absorbs the slack. Do not record a fake live demo for a vertical that isn't shipped.

## What NOT to show

- ❌ The contract code
- ❌ The Walrus SDK calls
- ❌ The signature-binding cryptography
- ❌ "Powered by Move" claims without context
- ❌ Architecture diagrams (those live in the README for judges who click through)

## Recording prep

- Pre-fund 3 wallets (Oathkeeper, Doubter, LP)
- Pre-mint Scenario A (kept), Scenario B (drawdown breach), Scenario D (dead-trader breach)
- Pre-warm DeepBook orderbook with enough depth for the fills to land
- Have the breach happen at a specific equity threshold the script controls
- Browser zoom 125%, no extensions, clean profile, 1920×1080
