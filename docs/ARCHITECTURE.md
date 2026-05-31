# Architecture (DRAFT — locked decisions live here, design exploration lives in scratch notes)

> Status: scaffold placeholder. Week 1 Day 1-2 task is to fill this in with the Move object design before writing any contract code.

> **⚠️ v2 SUPERSESSION (read first).** Sections below that describe an **LP pool**
> (`LPPool<T>`, `LPShare<T>`, `economics::create_pool`, a **60/40** premium split, or
> `doubter::claim_payout` taking `&mut LPPool<T>`) are **v1 and no longer accurate.**
> The shipped v2 economics is a **5-role model** (Oathkeeper / Client / Believer / Doubter
> / Platform) with a **10/20/70** split of loser stakes; there is **no LP pool**. Believers
> replaced the LP role as active market participants. `economics.move` is now just
> `compute_split` (10/20/70 bps). The authoritative economic spec is `docs/V2-DESIGN.md`;
> the authoritative contract surface is `contracts/sources/*.move` (46 tests). The Move
> object model, Hot Potato mint, scope-uniqueness, and Walrus/Seal/DeepBook notes below
> remain accurate.

## Move modules (planned)

```
oathkeeper::oath              — the Oath object + lifecycle entry functions
oathkeeper::doubter           — the Doubter Position object + stake/payout logic
oathkeeper::registry          — scope-uniqueness table + exec-binding table
oathkeeper::attestation       — TradeAttestation events + record_trade entry
oathkeeper::economics         — LPPool, premium splits (60/40), bond invariants, payouts
oathkeeper::signature         — exec wallet signature verification (ed25519 + ecdsa_k1)
oathkeeper::standing          — DEFERRED to Week 2+. Settlement signature does NOT take
                                &mut Standing in v1; standing aggregation reads settled
                                events off-chain or via a future thin wrapper that
                                doesn't touch the core settle_epoch surface.
```

### Day 4-5 implementation corrections (locked May 21)

Four signature changes from the Day 2-3 skeleton, surfaced while implementing bodies:

- **`ScopeReservation` is generic over `T`.** The hot potato has to carry the bond
  `Balance<T>` across the `start_epoch` → `bind_exec_wallet` boundary; an `amount: u64`
  field on a non-generic struct would have orphaned the actual coin value. No abilities
  added — the struct still has zero abilities, so the atomicity guarantee is intact.
- **Scope-reservation table insert deferred to `bind_exec_wallet`.** `start_epoch` checks
  `!has_scope` for an early-fail UX and constructs the hot potato; the table insert
  happens in `bind_exec_wallet` where the real `Oath` ID is available. Race-free because
  the entire PTB holds the `&mut Registry` lock end-to-end (Sui consensus sequences
  shared-object access at PTB granularity, not command granularity).
- **`doubter::claim_payout` takes `&mut LPPool<T>`.** Required for the Kept 60/40 split
  on the Doubter's stake. Skeleton signature lacked it because settle_epoch was thought
  to handle stakes — but stakes live inside `DoubterPosition` objects and aren't
  reachable from `settle_epoch`, so the LP deposit has to happen at claim time.
- **`doubter::stake_against` takes `&Clock`.** Needed to gate on `epoch_end_ms` not
  passed; relying on `STATUS_ACTIVE` alone is brittle because mark_breach/settle aren't
  guaranteed to fire at epoch end.

LPPool construction: `init` can't be generic, so `economics::create_pool<T>` is an entry
function called once per coin type post-deploy. Documented for the Week 4 deploy script.

### Day 2-3 interface decisions (locked May 21)

- **`Oath<phantom T>` generic over coin type.** Avoids hardcoding a USDC witness — testnet
  and mainnet USDC differ. The `T` flows through `DoubterPosition<T>`, `LPPool<T>`, and
  `LPShare<T>` so the entire settlement path is type-consistent.
- **`LPPool<T>` lives in `economics.move` from Day 2** (not deferred to Day 5). Reason:
  `settle_epoch`'s signature takes `&mut LPPool<T>`; without the type declared up front,
  the entry function signature would churn on Day 5 and break every test scaffolded
  against it. Bodies are still Day 5 work.
- **`OathType` enum lands Day 2** (not deferred to Week 2 Day 10). Reason: storing the
  enum on the `Oath` object is structural — adding it Day 10 would force a struct rewrite
  and break the scope-hash preimage (which includes `oath_type_tag`). The *adapter
  dispatch* logic is what defers to Day 10; the enum itself is here from the start.
- **`ScopeReservation` Hot Potato has zero abilities.** No `key`, no `store`, no `copy`,
  no `drop`. If it ever acquires `drop` by accident, the atomic mint guarantee silently
  dies — explicit comment in `oath.move` flags this.
- **Cross-module references use `object::ID`, not `address`.** `DoubterPosition.oath_id`,
  `LPShare.pool_id`, and registry table values are all `ID`.
- **Adapter modules (`adapter_trading`, `adapter_uptime`, `adapter_behavior`) are NOT
  scaffolded in Week 1.** They land Day 10 per the sprint plan. The Day 2-3 `attestation`
  module ships a single TradingOath-flavored `record_trade` entry; the Day 10 refactor
  extracts the trading-specific logic into `adapter_trading` without changing the entry
  surface.

## State machine for an Oath

```
Idle  ──start_epoch──▶  Active  ──record_trade*──▶  Active
                          │                          │
                          │                          ├──mark_breach──▶  Broken ──settle_epoch──▶  Settled
                          │                          │                                              │
                          └──epoch_end (drawdown OK,                                                │
                             other dims fail)──▶  Broken ──settle_epoch──▶  Settled                │
                                                                                                    │
                          └──epoch_end (all dims OK)──▶  Kept ──settle_epoch──▶  Settled──────────┘
```

## Object model decisions (refined May 20 with verified Sui patterns)

### Oath object: **Shared**

Per Sui object-ownership docs: *"Any address can use the object, subject to Move checks"* — required for permissionless `mark_breach()` and `settle_epoch()` callable by any wallet. Consensus-sequencing cost is acceptable for our throughput (each Oath has at most a few state transitions per epoch).

The Party (consensus-address-owned) hybrid was considered but rejected: it requires "a trusted party coordinates settlement," which contradicts our permissionless-settlement value proposition.

### Bond placement: hybrid — bond stays in Oath; LP pool is a separate shared object

Bond escrowed inside the Oath object using `Balance<USDC>` field. This makes the bond inseparable from the Oath state — clean ownership, no separate-pool-key reconciliation needed. The LP pool is a separate shared `LPPool` object that accepts deposits, issues share tokens, and receives 40% premium splits + breach residuals.

### Doubter Position: **owned object** (key + store, transferable)

Each Doubter stake is its own owned object. Transferable secondary market is a v2 opportunity but the type is right today. Stored in the Doubter's wallet, references the parent Oath by ID.

### Scope registry: `Table<ScopeKey, OathId>` at module level, shared `Registry` object

The `Registry` is one global shared object owning a `Table<ScopeKey, address_of_oath>`. ScopeKey = `(promiser_addr, scope_hash)` where `scope_hash = keccak256(exec_addr || venue || allowed_assets || epoch_duration || promise_dimensions)`. Lookup at mint reverts if key exists.

### Exec wallet registry: `Table<address, OathId>` on the same shared `Registry`

Enforces "one active oath per exec_addr." Cleared at settlement.

### Where Oath objects live in the registry: **`dynamic_object_field`**, not `dynamic_field`

Per Sui dynamic-field docs: `dynamic_field` wraps stored objects so they're inaccessible by ID from external tools (explorers, wallets). `dynamic_object_field` keeps them accessible. **We want external visibility** — allocators inspecting an Oathkeeper's Standing or specific oath history rely on Sui Explorer + indexers seeing every Oath object. **Use `dynamic_object_field`** for any per-Oath dynamic storage.

## Hot Potato pattern for atomic mint flow

The naive `start_epoch()` design has a race: check scope uniqueness → register → bind exec wallet. If these are separate transactions, another tx could register the same scope between the check and the bind.

**Fix with Hot Potato pattern (verified Sui idiom):** `start_epoch()` returns a `ScopeReservation` struct with NO abilities (no `key`, no `store`, no `copy`, no `drop`). The struct CANNOT be stored, copied, or discarded — it must be consumed in the same PTB. The next function — `bind_exec_wallet(ScopeReservation, signature, ...)` — consumes the hot potato and finalizes the registry entry. If the user doesn't call bind in the same PTB, the entire transaction aborts (hot potato unused).

This makes the mint flow atomic without shared-object reentrancy locks. Same-PTB execution is the Sui idiomatic way to enforce "these operations must complete together."

```move
// Pseudocode
public fun start_epoch(
    promiser: &signer,
    scope: StrategyScope,
    bond: Coin<USDC>,
    registry: &mut Registry,
): ScopeReservation {
    // ... check uniqueness, partially register
    ScopeReservation { promiser_addr, scope_hash, bond_amount }
}

public fun bind_exec_wallet(
    reservation: ScopeReservation,
    exec_signature: vector<u8>,
    registry: &mut Registry,
    clock: &Clock,
    ctx: &mut TxContext,
): Oath {
    // verify signature, consume reservation, finalize, return Oath
    let ScopeReservation { promiser_addr, scope_hash, bond_amount } = reservation;
    // ... ecdsa_k1::secp256k1_ecrecover verify ...
    // ... store in registry as dynamic_object_field ...
    Oath { /* ... */ }
}
```

## DeepBook integration (verified May 20)

### Execution venue: DeepBook V3 spot, NOT DeepBook Predict

DeepBook Predict is an options-like prediction-market protocol (binary positions + vertical ranges + SVI vol surface) and lives in its own Sui Overflow track. Oathkeeper targets the **DeFi & Payments** track and uses **DeepBook V3 spot** as the execution venue for the bound exec wallet's trades. We do not touch Predict.

### BalanceManager pattern

Per Sui docs: *"Before placing any trade, you must supply a balance manager address to the client."* Each user has a `BalanceManager` shared object that holds funds for trading. Orders are placed via the BalanceManager, not directly with arbitrary coin objects.

**Mapping to Oathkeeper:**
- The bound `exec_addr` owns a `BalanceManager` (created during onboarding or pre-existing)
- The Oathkeeper signature binding proves the promiser controls `exec_addr` → which controls the `BalanceManager` → which places DeepBook spot trades
- `record_trade(oath_id, deepbook_tx_hash, ...)` references the actual DeepBook trade tx, which Sui Explorer can resolve
- Reconciliation indexer can query the `BalanceManager`'s trade history to diff against on-chain attestations — closing the "missing fills" attack surface

### Fee model

DeepBook fees are paid in DEEP token (or input tokens at 2× rate). Stable pairs: 0.25 bps with DEEP. Volatile pairs: 2.5 bps with DEEP. Small but non-zero.

**Oathkeeper decision: fees are exec-wallet's problem.** The wager math (drawdown, PnL, volume) is computed against `BalanceManager` net balance which already nets fees. The exec wallet must maintain a DEEP token buffer (or accept 2× input-token fees) for trade execution. Not the protocol's job to subsidize.

### SDK

`@mysten/deepbook-v3` is the canonical package (not the older `@mysten/deepbook`). Uses `SuiGrpcClient.$extend(deepbook({...}))` pattern. Week 3 agent runner integration target.

### Read pattern (3-tier, from Sui docs verbatim)

> *"Use the public Predict server for page rendering, lists, portfolio summaries, vault summaries, and historical data. Sui checkpoint or event streaming supports pages that need low-latency oracle updates. Use direct onchain object reads immediately before or after wallet flows that need confirmation-critical state."*

For Oathkeeper frontend + reconciliation indexer:
- **Predict server / DeepBook indexer** for page rendering (Oath history, allocator dashboards, leaderboard) — don't roll our own
- **Sui event streaming** for live attestation feed during an active epoch
- **Direct on-chain object reads** for the oath state right before settlement actions

This avoids the indexer-architecture rabbit hole and ships faster.

## Walrus integration (verified May 20 — concrete SDK)

### SDK packages

```bash
npm install --save @mysten/walrus @mysten/sui
```

### Client init (same pattern as DeepBook)

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrus } from '@mysten/walrus';

const client = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(walrus());
```

### Write the sealed oath text

```ts
const sealedOathText = sealEncrypt(oathPlaintext, oathAccessPolicy);

const { blobId } = await client.walrus.writeBlob({
  blob: sealedOathText,
  deletable: false,                  // immutable for the oath lifetime
  epochs: oathEpochCount + 2,        // small buffer past settlement
  signer: oathkeeperKeypair,
});

// blobId is the Walrus merkle root → commit to oath.sealed_oath_text_root
```

### Read pattern for indexer / Doubter UI

```ts
const sealedBytes = await client.walrus.readBlob({ blobId });
// Doubters do NOT decrypt — they see the sealed blob exists + the on-chain commitments
// Only the bound exec_addr can decrypt via Seal access control
```

### Per-trade attestation blobs

For attestation proofs (DeepBook tx hash + agent reasoning + PnL delta), use the higher-level `WalrusFile` API to batch attestations into a quilt per epoch:

```ts
const attestations = perTradeData.map((td, i) => WalrusFile.from({
  contents: encode(td),
  identifier: `trade-${oathId}-${i}.json`,
}));

const results = await client.walrus.writeFiles({
  files: attestations,
  epochs: oathEpochCount + 12,       // longer retention for dispute window
  deletable: false,
  signer: arenaSignerKeypair,
});
```

### Cost model gotcha

Walrus storage requires **WAL token** (not just SUI). The signer must own:
- SUI — for transaction gas + blob registration tx
- WAL — for storage cost over `epochs`

**Decision:** the Oathkeeper protocol does NOT subsidize Walrus storage. The Oathkeeper (promiser) pays WAL for their own sealed-oath-text blob. The arena server pays WAL for per-trade attestation blobs (operating cost, absorbed in protocol fees). Document this clearly in the Oathkeeper onboarding UX.

### Retry handling

```ts
import { RetryableWalrusClientError } from '@mysten/walrus';

try {
  await client.walrus.writeBlob({ ... });
} catch (error) {
  if (error instanceof RetryableWalrusClientError) {
    client.walrus.reset();
    // retry
  }
}
```

High-level methods auto-retry; we use those, not raw shard/sliver operations.

## Seal integration (verified May 20)

### What Seal is

Decentralized secrets management with **identity-based encryption** + **onchain access control via Move smart contracts**. Threshold encryption (t-of-n) across key servers. **Mainnet-launched** (not testnet-only).

### Access control for Oathkeeper

The sealed oath text is encrypted such that **only the bound `exec_addr` of the active oath can decrypt**. Access policy defined as a Move smart contract that checks:

```move
// Pseudocode for the access-condition module
public fun can_decrypt_oath_text(
    requester: address,
    oath_id: ID,
    registry: &Registry,
): bool {
    let oath = registry::get_oath(registry, oath_id);
    requester == oath.exec_addr && oath.status == STATUS_ACTIVE
}
```

The Seal key servers, on a decryption request, query the access-condition Move function via a read-only call. If true, they release their key share. Decryption succeeds iff t-of-n key servers approve.

### Why this beats TEE

The 0G Orichalcos used TEE-attested inference (Intel TDX + Qwen 2.5 VL 72B). The Sui version's access-control model is **arguably stronger** for the verifiability story:

- TEE trust assumes one operator's enclave is honest
- Seal trust is distributed across t-of-n key servers, with access policy enforced by on-chain Move code
- Both prevent the operator from reading the oath text
- Seal's policy is **publicly auditable** (it's a Move contract on Sui); TEE attestation requires verifying a remote attestation chain

Lead the pitch with this. Don't apologize for not having TEE — claim the upgrade.

### SDK status

Seal has a TypeScript SDK (per Mysten Labs blog confirmation). Specific package name not surfaced in search yet — assume `@mysten/seal` or similar; verify Day 8 before Week 2 starts.

## Phase-0 Expansion — Multi-Vertical Commitment Market

> **Why this section exists.** A single-vertical pitch ("AI trading promise-kept market") wins a track. A multi-vertical pitch ("commitment-market infrastructure that happens to ship trading first") wins a category. The architectural cost is one enum + one adapter trait. The framing cost is zero — the README already says this. We're now wiring the contracts and the demo to back the claim.
>
> **Discipline.** Trading is the *depth* pitch (Scenarios A/B/C/D, ~80% of demo time, the only vertical with full attestation infrastructure). RPC uptime is the *breadth* pitch (real but shallow — proves the protocol generalizes). Agent-behavior is the *cherry on top* (mock attestation, contract-level enum support, ~10s of demo). Do **not** invert the ratio.

### `OathType` enum

```move
public enum OathType has copy, drop, store {
    TradingOath,    // v1 full: drawdown / min_trades / min_pnl / volume, DeepBook + HL attestation
    UptimeOath,     // v1 full: uptime_bps / min_pings, HTTPS-prober attestation adapter
    BehaviorOath,   // v1 mock: behavior_score_bps, off-chain judge attestation (demo-only path)
    ValidatorOath,  // enum-only, no adapter — roadmap signal in pitch deck
    TreasuryOath,   // enum-only, no adapter — roadmap signal in pitch deck
}
```

The enum lives on the `Oath` object. Every entry function that reads or mutates an oath dispatches on `oath_type` to the right attestation/breach-check path. Variants without an adapter shipped (`ValidatorOath`, `TreasuryOath`) are **rejected at mint** — they exist in the type system to make "Beyond Trading" not a marketing slide but a one-PR roadmap item. Be honest about this in the pitch.

### Per-type attestation adapter pattern

The shape:

```move
module oathkeeper::attestation_adapter {
    // Each vertical implements this surface in its own module.
    // The core oath module dispatches to the right one based on OathType.

    /// Validates a single attestation event against the oath's tuple.
    /// Returns Some(BreachReason) if this attestation triggers immediate breach,
    /// None if it's a normal-state update.
    public fun ingest(
        oath: &mut Oath,
        attestation_bytes: vector<u8>,
        adapter_proof: vector<u8>,   // signature / merkle proof / cross-chain receipt
        clock: &Clock,
    ): Option<BreachReason>;

    /// End-of-epoch evaluation. Called from settle_epoch().
    /// Returns Some(BreachReason) if any end-of-epoch dimension failed.
    public fun finalize(oath: &Oath): Option<BreachReason>;
}
```

Concrete modules:

```
oathkeeper::adapter_trading   — DeepBook tx hash + per-fill data → drawdown / count / pnl / volume
oathkeeper::adapter_uptime    — HTTPS prober attestation (ed25519-signed report) → uptime_bps / min_pings
oathkeeper::adapter_behavior  — mock judge signature over a behavior_score (demo only, swap to LLM-jury later)
```

The dispatch in `oath::record_attestation()` is a small match on `OathType`. No vtables, no dynamic dispatch — just `match` arms. Sui Move supports this cleanly.

### Per-vertical specifications

**Vertical #1 — `TradingOath` (full v1, the depth pitch)**

- `oath_tuple = (max_drawdown_bps, min_trades, min_pnl_bps, min_volume_usdc)`
- Attestation source: DeepBook V3 spot fills (primary) + Hyperliquid signed-per-trade messages (optional secondary). Already specified above in the DeepBook section.
- Breach detection: mid-epoch on drawdown (`mark_breach`), end-of-epoch on trade count / PnL / volume (`settle_epoch`).
- Status: **all infrastructure shipped, Scenarios A/B/C/D demoable.** This is what the prize is won on.

**Vertical #2 — `UptimeOath` (real adapter, breadth pitch, drop-if-slipping)**

- `oath_tuple = (uptime_bps, min_pings, epoch_duration_ms)` — e.g. ≥99.5% uptime over ≥1000 prober pings in 7 days.
- Attestation source: an open-source HTTPS prober (TypeScript, runs anywhere — same kind of trust model as the reconciliation indexer). The prober ed25519-signs each ping result; the oath is bound to the prober's pubkey at mint time the same way trading oaths bind `exec_addr`.
- Breach detection: `adapter_uptime::ingest()` aggregates ping success rate; mid-epoch breach if uptime drops below floor with no recovery path. End-of-epoch: `finalize()` checks `min_pings` met.
- Real users: any RPC operator, gateway, or paid API endpoint that wants to bond against an SLA.
- **Cut line: if this adapter is not testnet-functional by end of Day 17 (Jun 5), drop it.** A polished single-vertical submission beats a half-broken two-vertical one. The enum stays in either case.

**Vertical #3 — `BehaviorOath` (mock attestation, cherry on top)**

- `oath_tuple = (behavior_score_bps, min_judgments)` — e.g. ≥9000/10000 average score across ≥20 model interactions.
- Attestation source: a single signing key controlled by a "judge" (in v1, just our own dev key returning hardcoded scores; in v2, an LLM jury or human reviewer panel). The judge ed25519-signs each judgment.
- Breach detection: mid-epoch on rolling score below floor, end-of-epoch on judgment count.
- This is **deliberately mock** for the hackathon. The point is: the protocol doesn't care where the attestation comes from — DeepBook tx, HTTPS prober, LLM judge, all the same Move adapter shape. Pitching this with mock attestation is honest if we name it as mock.

### Explicit cut-line

| Vertical | v1 ship status | Demo time | Drop condition |
|----------|----------------|-----------|----------------|
| TradingOath | Full: adapter + indexer + DeepBook + Walrus + Seal | ~80% (Shots 1-6) | Never. This *is* the submission. |
| UptimeOath | Real adapter + prober + 1 live attested oath | ~30s (Shot 7a) | Drop if not testnet-functional by Day 17. Keep enum variant either way. |
| BehaviorOath | Mock adapter, contract enum support, scripted demo oath | ~10s (Shot 7b) | Drop only if Week 4 demo recording is at risk. |
| ValidatorOath | Enum variant only, rejected at mint | 0s (pitch deck roadmap slide) | N/A — zero cost. |
| TreasuryOath | Enum variant only, rejected at mint | 0s (pitch deck roadmap slide) | N/A — zero cost. |

### Connection to the README narrative

The README already frames Oathkeeper as commitment-market infrastructure ("Trading is the wedge; commitment-market infrastructure is the category"). The multi-vertical Phase-0 expansion is the contract-level proof of that claim — not a roadmap promise, a shipped enum + adapter pattern + one live secondary vertical. The demo's Shot 7 is the only place a judge sees this; the README and pitch deck reinforce.

### What does NOT change

- The trading vertical's design (Oath / Doubter / Registry / Attestation / Standing / Economics / Signature modules) is exactly as specified above. No refactor.
- The Hot Potato mint flow is unchanged.
- Scope-uniqueness still keyed on `(promiser_addr, scope_hash)` regardless of `OathType`. An Oathkeeper can run a TradingOath and an UptimeOath simultaneously — their scope hashes will not collide because `oath_type` is in the hash preimage.
- The bond/stake economics (60/40, 12.5% premium, conservation) are vertical-agnostic by construction.

### Concerns

- The Week 2 adapter pattern refactor is the *only* place this expansion can break Week 1's clean output. If on Day 8 the adapter trait shape forces a non-trivial change to the core `Oath` struct, freeze the shape and accept some duplication across adapters. Don't re-litigate Week 1 contracts.
- The UptimeOath prober is the closest real-user pitch in the submission — RPC operators are a concrete buyer class with budget. If it ships, it's worth more pitch-deck real estate than the demo time suggests. If it doesn't ship, do not fake it.
- The BehaviorOath mock is the highest narrative-leverage / lowest engineering-cost item in the build. The risk is judges asking "how does the judge stay honest?" and the answer being weak. Pre-script the answer: "the judge is bonded too — this is just the leaf attestation; the meta-oath is on the judge's track record." Have that line ready for Q&A, do not put it in the demo.

## Sources

- [Sui object ownership](https://docs.sui.io/concepts/object-ownership)
- [Sui dynamic fields](https://docs.sui.io/concepts/dynamic-fields)
- [Hot Potato pattern (Move Book)](https://move-book.com/programmability/hot-potato-pattern/)
- [Sui Move intro course unit 5 (hot potato)](https://intro.sui-book.com/unit-five/lessons/2_hot_potato_pattern.html)
- [Sui ecdsa_k1 module](https://www.docs.sui.io/references/framework/sui_sui/ecdsa_k1)
- [Mysten Labs cross-chain signature guide](https://tech.mystenlabs.com/cryptography-in-sui-cross-chain-signature-verification/)
- [DeepBook V3 standards](https://docs.sui.io/standards/deepbook)
- [DeepBook V3 SDK](https://docs.sui.io/standards/deepbookv3-sdk)
- [DeepBook Predict (NOT the venue for Oathkeeper)](https://docs.sui.io/onchain-finance/deepbook-predict/)
- [Walrus TypeScript SDK](https://sdk.mystenlabs.com/walrus)
- [`@mysten/walrus` on npm](https://www.npmjs.com/package/@mysten/walrus)
- [Seal product page](https://seal.mystenlabs.com/)
- [Seal docs](https://seal-docs.wal.app/)
- [Seal GitHub](https://github.com/MystenLabs/seal)
