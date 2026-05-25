# Oathkeeper

> **Verifiable opacity, bonded on Sui.**
>
> A commitment market for any opaque actor with private edge. Bond the outcome. Keep the work private. Let doubt price it in real time.

**Sui Overflow 2026 — DeFi & Payments track**
Submission deadline: **June 21, 2026**.

---

## The dilemma Oathkeeper resolves

Every operator with private edge faces the same broken choice:

**01. Show the work.** → Edge decays on contact. The moment your strategy, your infrastructure config, your model's reasoning, your validator setup is legible, it's copied, front-run, or commoditized. **Transparency taxes the skilled.**

**02. Hide the work.** → Your claims become illegible. "47% win rate," "99.95% uptime," "the model never hallucinates" — all carry the same signal weight as outright fraud. Capital cannot separate skill from luck, real from staged. **Opacity taxes the honest.**

**03. Bond the outcome.** → Both halves resolve. Don't reveal the work. Don't ask the market for trust. Stake the result. What gets revealed is the commitment — sealed, verified, expensive to break.

That is the category Oathkeeper sells: **verifiable opacity**. The mechanism stays private; the outcome is public, attested, and bonded.

The full pitch copy lives in [`submission/PITCH-COPY.md`](submission/PITCH-COPY.md).

---

## What this is (and isn't)

Oathkeeper is **not a prediction market.** Prediction markets price the world's behavior — election outcomes, asset prices, sports scores — using globally-observed oracles. They cannot, by construction, price individual-actor commitments: the subject isn't a market participant, has no bond at risk, can't author the claim's shape.

Oathkeeper is a **commitment market substrate.** The Oathkeeper opts in by bonding USDC, defines the oath themselves, and settlement resolves on their *own* on-chain behavior — not on the world's. It works wherever:

1. The oath is about the Oathkeeper's own actions
2. Breach is detectable from on-chain or cryptographically attested data
3. The Oathkeeper posts a bond proportional to their commitment
4. Doubters have information asymmetry that lets them spot unreliable Oathkeepers

This submission ships **three verticals at honest depths**, from the same `OathType`-dispatched contract:

| Vertical | "The work" (stays hidden) | "The outcome" (gets bonded) | v1 depth |
|----------|---------------------------|------------------------------|----------|
| **TradingOath** | Strategy, signals, sizing | Max drawdown, min trades, min PnL, min volume | Full (DeepBook + Hyperliquid) |
| **UptimeOath** | Infra, SOPs, monitoring | Uptime %, min prober pings | Real adapter + HTTPS prober |
| **BehaviorOath** | Model weights, prompts, RLHF | Behavior score across N judgments | Mock judge, real dispatch |
| **ValidatorOath** | Config, deployment, ops | Uptime, slash-rate | Enum-only (roadmap) |
| **TreasuryOath** | Positions, hedges, rebalances | Net yield, max drawdown | Enum-only (roadmap) |

Three shipped, two in the type system. The protocol does not care which is which — that's the category-level claim.

---

## Vocabulary

| Term | Meaning |
|------|---------|
| **Oathkeeper** | The protocol. Also: a user who bonds USDC against a verifiable oath. |
| **Oath** | The on-chain commitment object — multi-dimensional and bonded. |
| **Doubter** | A user who stakes against an active oath. Wins from the bond on breach; loses stake on a kept oath. |
| **Bond / Stake** | The Oathkeeper's principal capital / the Doubter's smaller wager (12.5% of claim). |
| **Standing** | An Oathkeeper's on-chain track record across kept oaths. The product Oathkeepers buy with the bond. |
| **Keep / Break** | An oath is *kept* if all dimensions hold; *broken* if any one fails. |
| **Settle** | Permissionless. Any wallet can trigger settlement once on-chain state meets the criteria. |
| **Verifiable opacity** | Category-level pitch phrase — the ability to make a private claim publicly costly to fake. |

---

## The mechanism (one read-through)

An Oathkeeper minting an oath provides:

- A **bond** in USDC (the principal at risk)
- An **oath tuple** (`max_drawdown_bps`, `min_trades`, `min_pnl_bps`, `min_volume_usdc`)
- A **scope tuple** (`exec_addr`, `venue`, `allowed_assets`, `epoch_duration_ms`)
- A **signature** from `exec_addr` over the scope+oath tuple — proves the Oathkeeper controls the execution wallet at binding time (replay-protected with `binding_nonce` + validity window)

The contract enforces:

- **No duplicate scopes per Oathkeeper.** `(promiser, scope_hash)` is unique. An Oathkeeper cannot run two parallel BTC oaths and time-route fills between them.
- **No out-of-scope fills.** `record_trade()` reverts if the traded asset is not in `allowed_assets`.
- **Single binding per exec wallet.** An exec address cannot back two active oaths simultaneously.
- **No degenerate oaths.** `min_trades >= 1` is enforced at mint — the protocol rejects "bond and do nothing" oaths.

While the epoch runs:

- Doubters call `stake_against(oath_id, claim_amount, stake_coin)`. Stake is `claim × 12.5%`. Contract reverts if `Σ open claims > bond_value`.
- The bound exec wallet trades; each fill attested via `record_trade(...)` (caller must be the bound `exec_addr`).
- **Mid-epoch breach (drawdown):** anyone can call `mark_breach(oath_id)` if `current_equity < starting × (1 − drawdown_bps)`. Status flips to `Broken`.
- **End-of-epoch breach (other dimensions):** at `settle_epoch(oath_id)`, the contract evaluates `trade_count`, `cumulative_volume`, `final_pnl`. Any failure flips to `Broken` with the reason recorded.

Settlement payouts:

- **Kept:** bond returns to Oathkeeper. Each Doubter's stake (still in their `DoubterPosition`) splits **60% Oathkeeper / 40% LPPool** at `claim_payout` time.
- **Broken:** each Doubter extracts their `claim_amount` from bond + gets stake refunded. Bond residual (= `bond − Σclaims`) sweeps to LPPool. Oathkeeper receives zero.
- **Conservation:** Σ inflows = Σ outflows in every outcome. The protocol skims nothing. Conservation is **numerically verified** in `claim_payout_broken_pays_claim_plus_stake_refund` test.

The asymmetric Oathkeeper payoff (max upside ≈ 7.5% of bond, max downside = entire bond) is intentional. The Oathkeeper isn't optimizing per-oath EV — they're paying a small premium-loss-rate to convert private edge into a publicly-legible, copyable-by-allocator track record. **Standing is the product the bond buys.** See [`PITCH-COPY.md`](submission/PITCH-COPY.md) for the full framing.

---

## Why Sui

Not a re-deployment of an existing protocol — a re-implementation in a more natural substrate:

| Primitive | Mapping | Why Sui is the better venue |
|-----------|---------|------------------------------|
| Per-oath state | Sui shared object (`key`) | Object-based ownership is *natively* what an oath is. No NFT-spec emulation, no storage-slot tricks. |
| Atomic mint flow | Hot Potato (`ScopeReservation<T>` with no abilities) | Move's type system enforces "these operations must complete together" without reentrancy locks. |
| Encrypted oath text | Walrus blob + Seal access policy | Walrus is purpose-built for verifiable large-blob availability; Seal's t-of-n + on-chain Move policy is a stronger trust model than TEE attestation. |
| On-chain execution | DeepBook V3 spot | First-class on-chain orderbook; per-fill attestation references real Sui txs. |
| Cross-chain execution | Hyperliquid (signature-bound exec wallet, Day 16) | Optional secondary venue via signed per-trade messages from the bound EVM exec wallet. |
| Exec wallet binding | `sui::ed25519::ed25519_verify` (DeepBook) + `sui::ecdsa_k1::secp256k1_ecrecover` (Hyperliquid) | Native Sui Move support for cross-chain signature verification, no external deps. |
| Settlement | Move modules with `public(package)` mutators + permissionless entries | Type system prevents accidental asset misrouting; permissionless settle removes the "trusted closer" centralization. |

---

## Status — what's shipped

| Layer | Status | Notes |
|-------|--------|-------|
| Move contracts | ✅ Complete | 6 modules, zero `abort 0` bodies remaining |
| ed25519 signature verification | ✅ Real (Day 6) | `sui::ed25519` + `blake2b256(0x00 \|\| pk)` address derivation |
| ecdsa_k1 / Hyperliquid signatures | ⏳ Day 16 | Test-mode pass-through with documented EIP-191 + decompress-pubkey + hash_flag gotchas |
| Move tests | ✅ **62 passing, 0 failing** | Includes numerical conservation check (10000 + 125 in = 1125 + 9000 out) |
| TypeScript agent scaffold | ✅ Boots + smoke-tested | `@mysten/sui@2.17` wired, testnet RPC smoke passes (chain id `4c78adac`) |
| Reconciliation indexer | ✅ Boots + polls | Event-shape types complete; deterministic-diff logic lands Day 20 |
| Walrus integration | ⏳ Week 2 (Day 8-9) | TypeScript SDK pipeline |
| Seal access policy | ⏳ Week 2 (Day 11) | Move access-condition module |
| DeepBook execution | ⏳ Week 3 (Day 15) | Agent runner places real testnet orders |
| Reconciliation indexer | ⏳ Week 3 (Day 20) | Open-source deterministic indexer |
| Frontend | ⏳ Week 4 (Day 22-24) | Spec ready in [`docs/UI-PROMPT.md`](docs/UI-PROMPT.md) |
| Mainnet deploy | ⏳ Week 4 (Day 25) | Required for 100% prize per handbook |
| Demo recording | ⏳ Week 4 (Day 27) | 7 shots, see [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) |

---

## Run it

```bash
# Move contracts
cd contracts
sui move build
sui move test
# expected: Test result: OK. Total tests: 62; passed: 62; failed: 0

# TypeScript agent (indexer, runner, prober, smoke test against testnet)
cd ../agent
pnpm install
pnpm typecheck                      # tsc --noEmit clean
pnpm test                           # vitest — 2 unit tests pass
pnpm smoke                          # hits testnet RPC, prints chain id + checkpoint
pnpm indexer                        # subscribes to OathKeeper events (set OATHKEEPER_PACKAGE_ID first)
```

Toolchain versions: `sui 1.60.0` (homebrew), `node >=22`, `pnpm 9+`, `@mysten/sui 2.17`, `@mysten/walrus 1.1`.

---

## Project map

```
oathkeeper-sui/
├── contracts/                    # Sui Move package
│   ├── sources/
│   │   ├── oath.move             # Oath object, mint flow, mark_breach, settle_epoch
│   │   ├── doubter.move          # DoubterPosition, stake_against, claim_payout
│   │   ├── registry.move         # scope-uniqueness + exec-binding tables
│   │   ├── economics.move        # LPPool, LP shares, premium splits
│   │   ├── attestation.move      # record_trade, dispute_attestation
│   │   └── signature.move        # ed25519 (real) + ecdsa_k1 (Day 16) verification
│   └── tests/                    # 62 #[test] functions across 6 test modules
├── docs/
│   ├── ARCHITECTURE.md           # Module design, state machine, design corrections log
│   ├── DEMO-SCRIPT.md            # 7-shot ≤5min demo plan
│   ├── SPRINT-PLAN.md            # 32-day build sprint
│   └── UI-PROMPT.md              # Self-contained brief for frontend agent
├── submission/
│   └── PITCH-COPY.md             # Master pitch text — "verifiable opacity" framing
├── agent/                        # TypeScript runtime (Walrus, Seal, DeepBook, indexer)
├── frontend/                     # Next.js 14 market UI (planned)
├── scripts/                      # Deploy + ops helpers
└── CLAUDE.md                     # Operating context for code sessions
```

---

## Out of scope (intentionally — do not ask)

- Dynamic / TEE-priced premiums (deferred to v4 roadmap)
- Vault-routing for idle bond capital (deferred to v3.5 roadmap)
- Multi-asset oaths with cross-asset hedging
- Real (non-mock) LLM-jury attestation for `BehaviorOath` — v2 only
- Validator / Treasury adapter implementations — enum-only in v1
- Standing portability across wallets (Standing follows the address only)

The pitch deck mentions these as roadmap. The contracts do not implement them. **Three verticals shipped at honest depths beats five faked.**

---

## Acknowledgments

The economic mechanism (asymmetric-payoff commitment market with permissionless settlement) was first explored under the project name **Orichalcos** for the 0G APAC Hackathon (May 2026). That submission is in independent judging; the design history is documented at `hackathons/hackquest-0g/` and is referenced as prior art under Sui Overflow's code-reuse rule.

The Sui port adds substantial new functionality required by the hackathon's eligibility rule:

- Full Move re-implementation (Solidity → Move is structural, not syntactic — Sui's object model required a redesign, not a port)
- Walrus integration (replaces 0G Storage)
- Seal integration (replaces 0G Compute TEE — stronger trust model)
- DeepBook execution venue (replaces Hyperliquid-only execution)
- Multi-dimensional oath tuple (was "v3.5 roadmap" on 0G; landed in v1 here)
- Scope-uniqueness enforcement (new)
- Signature-bound exec wallet with replay protection (new; 0G used social wallet-pairing convention)
- Open-source reconciliation indexer + dispute mechanism (new)
- "Verifiable opacity" category framing (refined for Sui submission)

All built during the May 7 – Jun 21 build window.
