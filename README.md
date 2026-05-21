# Oathkeeper

> A commitment market for verifiable behavioral promises.
>
> Promisers bond. Doubters stake. Breach pays. Every promise priced by the market that doubts it.

**Sui Overflow 2026 — DeFi & Payments track**
Submission deadline: **June 21, 2026**.

---

## What category this actually is

Oathkeeper is **not a prediction market**. Prediction markets price the world's behavior — election outcomes, asset prices, sports results — using globally-observed oracles. They cannot, by construction, price individual-actor commitments: the subject isn't a market participant, has no bond at risk, can't author the claim's shape, and protecting them from adversarial spam markets requires permissioned curation.

Oathkeeper is a **commitment market**: the promiser opts in by bonding USDC, defines the oath themselves, and settlement resolves on their own observable on-chain behavior — not on the world. The mechanism works wherever:

1. The oath is about the promiser's own actions
2. Breach is detectable from on-chain or cryptographically attested data
3. The promiser posts a bond proportional to their commitment
4. Doubters have information asymmetry that lets them identify unreliable promisers

This submission ships **three verticals at honest depths**, from the same `OathType`-dispatched contract:

- **AI trading** (full depth) — DeepBook + Hyperliquid attestation, reconciliation indexer, Scenarios A/B/C/D. The wedge.
- **RPC operator uptime** (real adapter, shallow) — open-source HTTPS prober posts ed25519-signed pings against a bonded SLA. Proves the protocol generalizes.
- **AI agent behavior** (mock judge, contract dispatch is real) — pure proof-of-shape for the agent-bonding vertical.

DAO treasury and validator performance live as enum variants today, adapters tomorrow. Trading is the wedge; commitment-market infrastructure is the category.

---

## Vocabulary

| Term | Meaning |
|------|---------|
| **Oathkeeper** | The protocol. Also: a user who bonds USDC against a verifiable oath. |
| **Oath** | The bonded promise — a multi-dimensional commitment object on Sui (drawdown ceiling, minimum trades, minimum PnL, asset allowlist, epoch duration). |
| **Doubter** | A user who stakes against an active oath. Earns from the bond on breach; loses stake on a kept oath. |
| **Standing** | An Oathkeeper's on-chain track record. Aggregates kept oaths over time. Allocators price decisions against Standing. |
| **Keep / Break** | An oath is *kept* if all its dimensions hold through the epoch. It is *broken* if any one fails. |
| **Settle** | Permissionless. Any wallet can trigger settlement once on-chain state meets the criteria. |

---

## The mechanism (one read-through)

An Oathkeeper minting an oath provides:

- A **bond** in USDC (the principal at risk).
- An **oath tuple**:
  - `max_drawdown_bps` — equity floor (e.g. ≤20% drawdown).
  - `min_trades` — minimum fills the Oathkeeper must execute (e.g. ≥10).
  - `min_pnl_bps` — minimum net PnL by epoch end (e.g. ≥5%).
  - `min_volume_usdc` — minimum cumulative notional traded.
- A **scope tuple**:
  - `exec_addr` — the wallet authorized to trade for this oath.
  - `venue` — DeepBook (Sui-native) or Hyperliquid (cross-chain).
  - `allowed_assets` — explicit allowlist (e.g. BTC, ETH).
  - `epoch_duration_ms`.
- A **signature** from `exec_addr` over the scope+oath tuple — proves the Oathkeeper controls the execution wallet at binding time.

The contract enforces:

- **No duplicate scopes per Oathkeeper** — `(promiser, scope_hash)` is unique. An Oathkeeper cannot run two parallel BTC oaths and time-route their fills.
- **No out-of-scope fills** — `record_trade()` reverts if the traded asset is not in `allowed_assets`.
- **Single binding per exec wallet** — an exec address cannot back two active oaths simultaneously.

While the epoch runs:

- Doubters call `stake_against(oath_id, claim_amount)`. Stake is a fixed fraction of claim (12.5% default). The contract reverts if `Σ open claims > bond`.
- The exec wallet trades on the bound venue. Each fill is attested via `record_trade(oath_id, venue_tx_hash, asset, pnl_delta, equity_after, notional)`.
- **Mid-epoch breach (drawdown)**: anyone can call `mark_breach(oath_id)` if current equity < threshold. Status flips to `Broken`.
- **End-of-epoch breach (other dimensions)**: at `settle_epoch(oath_id)`, the contract checks `trade_count`, `final_pnl`, `cumulative_volume`. Any failure flips status to `Broken` with reason recorded.

Settlement payouts:

- **Kept**: bond returned to Oathkeeper. Doubter stakes split **60% to Oathkeeper / 40% to LPs**.
- **Broken**: bond pays open doubter claims first (in claim order), residual sweeps to LPs. Oathkeeper receives zero.
- **Conservation**: sum across roles = 0 in every outcome. The protocol skims nothing.

---

## Why Sui

The Sui port is not a re-deployment of an existing protocol — it's a re-implementation in a more natural substrate:

| Primitive | Mapping | Why Sui is the better venue |
|-----------|---------|------------------------------|
| Per-oath state | Sui Object (`key + store`) | Object-based ownership is *natively* what an oath is. No NFT spec emulation, no storage-slot tricks. |
| Encrypted oath text | Walrus blob + Seal access control | Walrus is purpose-built for verifiable large-blob availability; Seal is the cleaner trust model than off-chain TEE. |
| On-chain execution | DeepBook | First-class on-chain orderbook; per-fill attestation references real Sui txs. |
| Cross-chain execution | Hyperliquid (via signature-bound exec wallet) | Optional secondary venue, attested via signed per-trade messages from the bound exec wallet. |
| Settlement | Move modules, permissionless entry functions | Move's type system prevents accidental asset misrouting at settlement time. |

---

## Status

This is a fresh scaffold as of **2026-05-20**. See:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — contract module design + state machine
- [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) — shot-by-shot ≤5min demo plan
- [`docs/SPRINT-PLAN.md`](docs/SPRINT-PLAN.md) — 32-day build sprint (Week 1 contract gate at May 26)
- [`CLAUDE.md`](CLAUDE.md) — operating context for code sessions

## Out of scope (intentionally)

Treasury risk-discipline and validator performance bonds exist as `OathType` enum variants but are rejected at mint — no adapter ships in v1. The AI agent behavior adapter ships with a mocked judge (named as such in the demo); a real LLM-jury or human-panel judge is v2. None of this is hidden in the pitch — honesty about depth is the credibility move.

## Acknowledgments

The economic mechanism (symmetric-payoff commitment market with permissionless settlement) was first explored under the project name **Orichalcos** for the 0G APAC Hackathon (May 2026). That submission is in independent judging; the design history is documented in `hackathons/hackquest-0g/` and is permitted to be referenced as prior art under Sui Overflow's code-reuse rule. The Sui port adds substantial new functionality required by the hackathon's eligibility rule: full Move re-implementation, Walrus + Seal integration, DeepBook execution, multi-dimensional oath tuple, scope-uniqueness enforcement, and signature-bound execution wallets — all built during the May 7 – Jun 21 build window.
