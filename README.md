# Oathkeeper

> **Verifiable opacity, bonded on Sui.**
>
> A commitment market for any opaque actor with private edge. Bond the outcome. Keep the work private. Let doubt price it in real time.

**Sui Overflow 2026 -- DeFi & Payments track**
Submission deadline: **June 21, 2026**.

---

## The dilemma Oathkeeper resolves

Every operator with private edge faces the same broken choice:

**01. Show the work.** Edge decays on contact. The moment your strategy, your infrastructure config, your model's reasoning, your validator setup is legible, it is copied, front-run, or commoditized. **Transparency taxes the skilled.**

**02. Hide the work.** Your claims become illegible. "47% win rate," "99.95% uptime," "the model never hallucinates" -- all carry the same signal weight as outright fraud. Capital cannot separate skill from luck, real from staged. **Opacity taxes the honest.**

**03. Bond the outcome.** Both halves resolve. Don't reveal the work. Don't ask the market for trust. Stake the result. What gets revealed is the commitment -- sealed, verified, expensive to break.

That is the category Oathkeeper sells: **verifiable opacity**. The mechanism stays private; the outcome is public, attested, and bonded.

---

## What this is

Oathkeeper is **not a prediction market.** Prediction markets price world-observable events using external oracles. They cannot, by construction, price individual-actor commitments: the subject is not a market participant, has no bond at risk, and cannot author the claim's shape.

Oathkeeper is **onchain SLA infrastructure.** The Oathkeeper opts in by bonding USDC, defines the oath themselves, and settlement resolves on their own on-chain behavior -- not on the world's. It works wherever:

1. The oath is about the Oathkeeper's own actions
2. Breach is detectable from on-chain or cryptographically attested data
3. The Oathkeeper posts a bond proportional to their commitment
4. Believers and Doubters have enough information to price reliability

---

## The five roles

| Role | Capital at risk | Wins when |
|------|----------------|-----------|
| **Oathkeeper** | Bond (full) | Oath Kept -- gets bond back + 20% of Doubter stakes |
| **Client** | Nothing | Oath Broken -- gets client_claim from bond + 20% of Believer stakes |
| **Believer** | Stake (full) | Oath Kept -- gets stake back + pro-rata share of 70% of Doubter stakes |
| **Doubter** | Stake (full) | Oath Broken -- gets stake back + pro-rata share of 70% of Believer stakes |
| **Platform** | Nothing | Always -- 10% of loser stakes on every settled oath |

The Client registers a claim amount against the Oathkeeper's bond at oath creation. The Client pays no capital -- their cost is whatever service subscription they already pay off-chain. Believers and Doubters are open-market participants; neither is required for the SLA to function.

---

## Vocabulary

| Term | Meaning |
|------|---------|
| **Oath** | The on-chain SLA commitment object -- multi-dimensional and bonded. |
| **Bond** | The Oathkeeper's principal capital locked into the Oath. |
| **Stake** | Capital placed by a Believer or Doubter. |
| **Kept** | All oath dimensions held at settlement. |
| **Broken** | Any dimension failed (drawdown, trade count, PnL, volume). |
| **Standing** | An Oathkeeper's on-chain track record of kept oaths (derived from events). |
| **Verifiable opacity** | The ability to make a private claim publicly costly to fake. |

---

## The mechanism

An Oathkeeper minting an oath provides:

- A **bond** in USDC (the principal at risk)
- An **oath tuple** (`max_drawdown_bps`, `min_trades`, `min_pnl_bps`, `min_volume_usdc`)
- A **scope tuple** (`exec_addr`, `venue`, `allowed_assets`, `epoch_duration_ms`)
- A **signature** from `exec_addr` over the scope + oath tuple (proves the Oathkeeper controls the execution wallet at binding time; replay-protected with `binding_nonce` + validity window)
- A **client** address and **client_claim** amount (the SLA counterparty; `client_claim <= bond`)

The contract enforces:

- **No duplicate scopes per Oathkeeper.** `(promiser, scope_hash)` is unique. An Oathkeeper cannot run two parallel BTC oaths.
- **No out-of-scope fills.** `record_trade()` reverts if the traded asset is not in `allowed_assets`.
- **Single binding per exec wallet.** An exec address cannot back two active oaths simultaneously.
- **No degenerate oaths.** `min_trades >= 1` is enforced at mint -- the contract rejects "bond and do nothing" oaths.

**During the epoch:**

- Believers call `stake_for(oath_id, coin)`. Any amount, any time while the oath is Active and the epoch has not ended.
- Doubters call `stake_against(oath_id, coin)`. Same timing gates.
- The bound exec wallet calls `record_trade(...)` to attest fills; caller must be the bound `exec_addr`.
- **Mid-epoch breach (drawdown):** anyone can call `mark_breach(oath_id)` if `current_equity < starting_equity * (1 - drawdown_bps/10000)`. Status flips to Broken.
- **End-of-epoch breach:** at `settle_epoch(oath_id)`, the contract evaluates `trade_count`, `cumulative_volume`, `final_equity`. Any failure flips to Broken with the reason recorded.

**Settlement -- Kept:**

Loser pool = all Doubter stakes. Split: 10% Platform / 20% Oathkeeper / 70% into winner payout pool. Bond returns in full to Oathkeeper. Winner pool (Believers' own stakes + 70% of Doubter stakes) is claimed pro-rata by Believers.

**Settlement -- Broken:**

Bond: `client_claim` goes to Client, residual (`bond - client_claim`) goes to Platform. Loser pool = all Believer stakes. Split: 10% Platform / 20% Client / 70% into winner payout pool. Winner pool (Doubters' own stakes + 70% of Believer stakes) is claimed pro-rata by Doubters.

**Conservation (verified on-chain):**

Total USDC in (bond + believer stakes + doubter stakes) = total USDC out across all five roles. The Platform's 10% is explicitly counted as an outflow. Net deltas sum to zero.

Example (Kept): bond 10000 + believer 2000 + doubter 1500 = 13500 in. Oathkeeper +300, believer +1050, doubter -1500, platform +150, client 0. Sum = 0.

Example (Broken): same inputs. Oathkeeper -10000, believer -2000, doubter +1400, platform +5200, client +5400. Sum = 0.

Both verified live on Sui testnet (see "What is shipped" below).

---

## OathType enum

The Oath struct carries an `OathType` field. Three variants are mintable; two are roadmap signals:

| Variant | Mint status | Attestation path |
|---------|-------------|-----------------|
| `TradingOath` | Active (full depth) | `record_trade` via bound exec wallet -- DeepBook or Hyperliquid |
| `UptimeOath` | Active (enum + mint gate only) | No adapter yet -- roadmap |
| `BehaviorOath` | Active (enum + mint gate only) | No adapter yet -- roadmap |
| `ValidatorOath` | Rejected at mint | Enum variant only |
| `TreasuryOath` | Rejected at mint | Enum variant only |

The contract accepts `UptimeOath` and `BehaviorOath` at mint but has no attestation adapter for them in v1. The `OathType` enum is in the type system today so that "Beyond Trading" is a one-PR addition per vertical, not a re-architecture.

---

## Why Sui

| Primitive | Mapping | Why Sui |
|-----------|---------|---------|
| Per-oath state | Shared object (`key`) | Object-based ownership is natively what a bonded commitment is. |
| Atomic mint flow | Hot Potato (`ScopeReservation<T>` with zero abilities) | Move's type system enforces "these two calls must complete in the same PTB" without reentrancy locks. |
| Encrypted oath text | Walrus blob + Seal access policy (PLANNED) | Walrus for verifiable availability; Seal t-of-n for access-controlled decrypt. |
| On-chain execution | DeepBook V3 spot (PLANNED) | First-class on-chain orderbook; per-fill attestation references real Sui txs. |
| Exec wallet binding | `sui::ed25519::ed25519_verify` (DeepBook) + `sui::ecdsa_k1` pass-through (Hyperliquid, Day 16) | Native Sui Move crypto, no external deps. |
| Settlement | Move modules with `public(package)` mutators + permissionless entries | Type system prevents asset misrouting; permissionless settle removes trusted-closer risk. |

---

## What is shipped

| Layer | Status | Notes |
|-------|--------|-------|
| Move contracts | Shipped | 7 protocol modules + 1 mock USDC module; zero `abort 0` bodies |
| Move tests | **46 passing, 0 failing** | Includes numerical conservation checks for both Kept and Broken outcomes |
| ed25519 signature verification | Shipped (Day 6) | `sui::ed25519` + `blake2b256(0x00 || pk)` address derivation; proven with offline vector in `ed25519_real_signature_verifies` test |
| ecdsa_k1 / Hyperliquid signatures | Pass-through (Day 16) | Documented gate; real `secp256k1_ecrecover` + EIP-191 + pubkey decompress lands Day 16 |
| Testnet deploy | Shipped | Package `0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9` |
| Registry | Shipped | `0x670b6d6e19fddcf7cf2d0877b8efb7b082be4a6a6c0f1cc3876a7ab238cd8838` |
| Mock USDC (permissionless faucet) | Shipped | TreasuryCap `0x44c876716bfc74fc1d8be5b15731c4c78f099fc2efd77fba77428c94c1b8aae5` |
| E2E -- Kept (live testnet) | Verified | Believer +1050, doubter -1500, platform +150, oathkeeper +300, client 0; sum = 0 |
| E2E -- Broken (live testnet) | Verified | Client +5400, platform +5200, doubter +1400, believer -2000, oathkeeper -10000; sum = 0 |
| TypeScript agent workspace | Shipped | `@mysten/sui 2.17`; smoke, seed, snapshot, e2e scripts; event-poller indexer |
| Frontend | Shipped | Next.js 16 + Tailwind 4 + dapp-kit; Browse / Detail / Mint / Portfolio screens; reads live testnet data; real on-chain actions (faucet, mint, stake, settle, claim, record_trade) |
| Sentiment chart | Shipped | Polymarket-style Believer share of pool over time |
| Operator Standing | From events | Derived from on-chain `OathMinted` / `OathSettled` events; no separate on-chain module |

---

## What is roadmap (not shipped)

- **Walrus blob storage** -- `sealed_oath_text_root` is currently an opaque argument; actual Walrus upload/download pipeline is planned for Week 2
- **Seal encryption + access control** -- Move access-condition module not written yet
- **DeepBook order execution** -- agent runner placing real testnet orders is Week 3 work
- **ecdsa_k1 real verify** -- Hyperliquid venue binding uses pass-through today; real `secp256k1_ecrecover` lands Day 16
- **On-chain Standing module** -- standing is computed from events; a queryable on-chain object is v2
- **Dispute resolution** -- `dispute_attestation` emits an event; full slashing logic is Week 3
- **UptimeOath attestation adapter** -- enum variant mintable, no prober or adapter
- **BehaviorOath attestation adapter** -- enum variant mintable, no judge or adapter
- **Vault yield** -- idle capital does not route to money markets in v1; all yield fields are mocked / omitted
- **Multi-client per bond** -- v1 is one Oathkeeper, one Client per Oath; multi-client is v2
- **Mainnet deploy** -- scheduled Day 25 (June 14); required for 100% prize per handbook
- **Demo video / pitch deck** -- Week 4

---

## Tech stack

| Layer | Tool |
|-------|------|
| Smart contracts | Sui Move (latest mainnet-compatible toolchain) |
| Storage (planned) | Walrus |
| Encryption / access control (planned) | Seal |
| On-chain execution (planned) | DeepBook V3 spot |
| Cross-chain execution (planned) | Hyperliquid testnet, signature-bound |
| Agent runtime | TypeScript, `@mysten/sui 2.17` |
| Frontend | Next.js 16, Tailwind 4, `@mysten/dapp-kit` |
| Indexer | TypeScript, event poller |

---

## Run it

```bash
# Move contracts (Sui Move)
cd contracts
sui move build
sui move test
# expected: Test result: OK. Total tests: 46; passed: 46; failed: 0

# TypeScript agent -- e2e against live testnet
# Requires: OATHKEEPER_PACKAGE_ID, OATHKEEPER_REGISTRY_ID,
#           OATHKEEPER_USDC_TREASURY_ID, OATHKEEPER_DEPLOYER_KEY
cd agent
bun install
SCENARIO=kept  bunx tsx src/e2e.ts   # Kept scenario
SCENARIO=broken bunx tsx src/e2e.ts   # Broken scenario

# Frontend (against live testnet package above)
cd frontend
bun install
bun run dev
# Open http://localhost:3000
```

Toolchain: `sui 1.60.0`, `bun >= 1.1`, `@mysten/sui 2.17`.

---

## Project map

```
oathkeeper-sui/
+-- contracts/                    # Sui Move package
|   +-- sources/
|   |   +-- oath.move             # Oath object, mint (Hot Potato), mark_breach, settle_epoch
|   |   +-- believer.move         # BelieverPosition, stake_for, claim_payout
|   |   +-- doubter.move          # DoubterPosition, stake_against, claim_payout
|   |   +-- registry.move         # scope-uniqueness + exec-binding tables
|   |   +-- economics.move        # compute_split (10/20/70 bps)
|   |   +-- attestation.move      # record_trade, dispute_attestation
|   |   +-- signature.move        # ed25519 (real) + ecdsa_k1 (pass-through)
|   |   +-- usdc.move             # mock USDC with permissionless faucet
|   +-- tests/
|       +-- v2_tests.move         # 46 tests (conservation, staking, settlement, breach, pro-rata)
+-- docs/
|   +-- ARCHITECTURE.md           # Module design, state machine, integration plans
|   +-- V2-DESIGN.md              # Authoritative v2 economics spec
|   +-- SPRINT-PLAN.md            # 32-day build sprint
+-- agent/                        # TypeScript runtime (smoke, seed, snapshot, e2e, indexer)
+-- frontend/                     # Next.js 16 market UI (live against testnet)
+-- scripts/                      # Deploy + ops helpers
+-- CLAUDE.md                     # Operating context for code sessions
```

---

## Out of scope (intentionally)

- Dynamic / TEE-priced premiums (v4 roadmap)
- Vault-routing for idle bond capital (v2 roadmap)
- Multi-asset oaths with cross-asset hedging
- Real LLM-jury attestation for BehaviorOath -- v2 only
- Validator / Treasury adapter implementations -- enum-only in v1
- Standing portability across wallets

---

## Acknowledgments

The economic mechanism (asymmetric-payoff commitment market with permissionless settlement) was first explored under the project name **Orichalcos** for the 0G APAC Hackathon (May 2026). That submission is in independent judging; the design history is documented at `hackathons/hackquest-0g/` and is referenced as prior art under Sui Overflow's code-reuse rule.

The Sui port adds substantial new functionality required by the hackathon's eligibility rule:

- Full Move re-implementation (Solidity to Move is structural, not syntactic -- Sui's object model required a redesign, not a port)
- Walrus integration (planned; replaces 0G Storage)
- Seal integration (planned; replaces 0G Compute TEE)
- DeepBook execution venue (planned; replaces Hyperliquid-only execution)
- Multi-dimensional oath tuple (was "v3.5 roadmap" on 0G; landed in v1 here)
- Scope-uniqueness enforcement (new)
- Signature-bound exec wallet with replay protection (new; 0G used social wallet-pairing convention)
- 5-role economics with 10/20/70 split (new; 0G used a simpler two-party model)
- Open-source reconciliation indexer + dispute mechanism (new)

All built during the May 7 -- Jun 21 build window.
