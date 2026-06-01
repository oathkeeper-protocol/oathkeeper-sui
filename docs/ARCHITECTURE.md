# Architecture

> **v2 economics.** This document reflects the shipped v2 5-role model (Oathkeeper / Client / Believer / Doubter / Platform) with 10/20/70 settlement. There is no LP pool. See `docs/V2-DESIGN.md` for the full economic spec and `contracts/sources/*.move` for the authoritative contract surface (46 tests).

---

## Move modules

```
oathkeeper::oath          -- Oath shared object, Hot Potato mint, mark_breach, settle_epoch
oathkeeper::believer      -- BelieverPosition, stake_for, claim_payout
oathkeeper::doubter       -- DoubterPosition, stake_against, claim_payout
oathkeeper::registry      -- scope-uniqueness table + exec-binding table
oathkeeper::economics     -- compute_split (10/20/70 bps); no LP pool
oathkeeper::attestation   -- record_trade, dispute_attestation
oathkeeper::signature     -- ed25519 (real) + ecdsa_k1 (pass-through until Day 16)
oathkeeper::usdc          -- mock USDC with permissionless faucet (test/demo only)
```

Total: 7 protocol modules + 1 mock USDC module.

---

## v2 Economics

### Five roles

| Role | Capital | Settlement outcome |
|------|---------|-------------------|
| Oathkeeper | Bond | Kept: bond returned + 20% of loser (Doubter) stakes. Broken: bond lost. |
| Client | None | Kept: nothing. Broken: `client_claim` from bond + 20% of loser (Believer) stakes. |
| Believer | Stake | Kept: stake returned + pro-rata share of 70% of Doubter stakes. Broken: stake lost. |
| Doubter | Stake | Kept: stake lost. Broken: stake returned + pro-rata share of 70% of Believer stakes. |
| Platform | None | Always: 10% of loser stakes (Doubter stakes on Kept; Believer stakes on Broken). On Broken: also receives bond residual (`bond - client_claim`). |

### The 10/20/70 split

`economics::compute_split(total)` returns `(platform, secondary, winner)` where:

- `platform = total * 10%`
- `secondary = total * 20%`
- `winner = total - platform - secondary` (subtraction avoids rounding drift; conservation is exact)

On Kept: loser pool = Doubter stakes. Secondary = Oathkeeper.
On Broken: loser pool = Believer stakes. Secondary = Client.

Winners (Believers on Kept; Doubters on Broken) receive their own stakes back plus a pro-rata share of the 70% winner pool.

### Balance fields on the Oath object

```move
bond:               Balance<T>   // Oathkeeper's locked bond
believer_pool:      Balance<T>   // All Believer stakes pooled at stake time
doubter_pool:       Balance<T>   // All Doubter stakes pooled at stake time
winner_payout_pool: Balance<T>   // Filled at settle_epoch; winners drain pro-rata
```

Counters: `total_believer_stakes`, `total_doubter_stakes`, `winner_stakes_remaining` (decremented as each winner claims; drives pro-rata math).

### Pro-rata proportional-drain

```move
// oath::claim_winner_share -- called from believer::claim_payout / doubter::claim_payout
let share = if (remaining == my_stake) {
    pool_val                                          // last claimer takes the remainder exactly
} else {
    pool_val * my_stake / remaining                   // proportional
};
winner_stakes_remaining -= my_stake;
```

This pattern prevents rounding-error accumulation and ensures the last claimer drains the pool to zero regardless of rounding.

### Settlement flows in full

**Kept:**

```
bond_balance        -> Oathkeeper (100%)
doubter_pool:
  10%               -> Platform
  20%               -> Oathkeeper
  70% (remaining)   -> joined into winner_payout_pool
believer_pool       -> joined into winner_payout_pool (own stakes back)

winner_payout_pool = believer_pool + 0.7 * doubter_pool
Each Believer calls claim_payout -> receives pro-rata share
```

**Broken:**

```
bond_balance:
  client_claim      -> Client
  residual          -> Platform

believer_pool:
  10%               -> Platform
  20%               -> Client
  70% (remaining)   -> joined into winner_payout_pool
doubter_pool        -> joined into winner_payout_pool (own stakes back)

winner_payout_pool = doubter_pool + 0.7 * believer_pool
Each Doubter calls claim_payout -> receives pro-rata share
```

### Conservation

Inflows = bond + believer stakes + doubter stakes. Outflows = same total redistributed among the five roles. Net deltas sum to zero. Proven numerically in `v2_tests::settle_kept_conservation_with_market` and `v2_tests::settle_broken_conservation_with_market`, and verified end-to-end on Sui testnet.

Concrete numbers (bond=10000, client_claim=5000, believer=2000, doubter=1500; total=13500):

- **Kept:** oathkeeper +300, believer +1050, doubter -1500, platform +150, client 0. Sum = 0.
- **Broken:** oathkeeper -10000, believer -2000, doubter +1400, platform +5200, client +5400. Sum = 0.

---

## Oath object structure

```move
public struct Oath<phantom T> has key {
    id: UID,
    promiser: address,
    oath_type: OathType,
    dims: OathDimensions,       // max_drawdown_bps, min_trades, min_pnl_bps, min_volume_usdc
    scope: StrategyScope,       // exec_addr, venue, allowed_assets, epoch_duration_ms
    scope_hash: vector<u8>,
    bond: Balance<T>,
    believer_pool: Balance<T>,
    doubter_pool: Balance<T>,
    winner_payout_pool: Balance<T>,
    client: address,
    client_claim: u64,
    total_believer_stakes: u64,
    total_doubter_stakes: u64,
    winner_stakes_remaining: u64,
    sealed_oath_text_root: vector<u8>,   // opaque arg for now; Walrus blob id in v2
    binding_nonce: u64,
    epoch_start_ms: u64,
    epoch_end_ms: u64,
    starting_equity_usdc: u64,
    current_equity_usdc: u64,
    cumulative_volume_usdc: u64,
    trade_count: u64,
    status: u8,
    breach_reason: Option<u8>,
}
```

`OathType` enum: `TradingOath`, `UptimeOath`, `BehaviorOath`, `ValidatorOath`, `TreasuryOath`. Validator and Treasury are rejected at mint. Uptime and Behavior are accepted at mint but have no attestation adapter in v1.

---

## State machine

```
Idle  --start_epoch-->  Active  --record_trade*-->  Active
                          |                          |
                          |                    mark_breach (drawdown)
                          |                          |
                          |                          v
                          |                        Broken --settle_epoch-->  Settled
                          |
                          +--settle_epoch (epoch ended, dims fail) --> Broken --> Settled
                          |
                          +--settle_epoch (epoch ended, all dims pass) --> Kept --> Settled
```

`settle_epoch` is permissionless (any wallet can call). `mark_breach` is permissionless. Both are idempotent-safe: `settle_epoch` aborts on `EAlreadySettled`; `mark_breach` aborts on `ENotActive`.

---

## Object model decisions

### Oath object: Shared

Any wallet can call `mark_breach` and `settle_epoch` -- that requires shared-object access. Consensus-sequencing cost is acceptable for the throughput profile (a few state transitions per epoch per oath). The alternative (party-owned, trusted coordinator) contradicts permissionless-settlement.

### Bond escrowed inside Oath

`Balance<T>` field on the Oath object. Bond is inseparable from oath state, no separate-pool-key reconciliation.

### BelieverPosition and DoubterPosition: owned objects

Each staker receives an owned `BelieverPosition<T>` / `DoubterPosition<T>` in their wallet. The position holds only the `stake_amount` (no Balance); actual funds pool into `believer_pool` / `doubter_pool` on the shared Oath. This enables pool-level pro-rata math without iterating individual positions.

### Scope registry: shared Registry object

One global shared `Registry` owns:
- `scope_table: Table<ScopeKey, ID>` -- enforces `(promiser, scope_hash)` uniqueness
- `exec_table: Table<address, ID>` -- enforces one active oath per exec wallet

Both tables are cleared at settlement (`release_scope`, `unbind_exec`).

### Dynamic fields

Oath objects are created as Sui shared objects, not stored in the Registry's dynamic fields. External tools (explorers, indexers, the frontend) read them directly by object ID. `dynamic_object_field` is available for per-Oath supplementary storage but is not used in v1.

---

## Hot Potato mint flow

The naive `start_epoch` design has a race: check scope uniqueness, then register, then bind exec wallet -- a second tx could register the same scope between steps.

**Fix: Hot Potato pattern.** `start_epoch` returns `ScopeReservation<T>` with **zero abilities** (no `key`, no `store`, no `copy`, no `drop`). The struct cannot be stored, copied, or discarded -- it must be consumed in the same PTB by `bind_exec_wallet`. If the caller skips `bind_exec_wallet`, the PTB aborts (unconsumed hot potato).

```move
// Zero-ability struct -- no key, no store, no copy, no drop
public struct ScopeReservation<phantom T> {
    promiser: address,
    scope_hash: vector<u8>,
    bond: Balance<T>,
    // ... all remaining oath fields
}

public fun start_epoch<T>(registry: &mut Registry, ...) -> ScopeReservation<T> {
    // validates dims, checks !has_scope (early UX fail), returns hot potato
}

public fun bind_exec_wallet<T>(
    reservation: ScopeReservation<T>,
    exec_signature: vector<u8>,
    exec_pubkey: vector<u8>,
    valid_from_ms: u64,
    valid_until_ms: u64,
    registry: &mut Registry,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // destructures reservation, verifies signature, inserts into registry,
    // creates Oath, transfers as shared object
}
```

The scope-reservation table insert happens in `bind_exec_wallet` (not `start_epoch`) because the real `Oath` ID is not available until the Oath is created. Race-free: the entire PTB holds `&mut Registry` end-to-end.

### Scope hash

`registry::compute_scope_hash` runs `keccak256` over BCS-serialized:
`(exec_addr, venue, allowed_assets, epoch_duration_ms, max_drawdown_bps, min_trades, min_pnl_bps, min_volume_usdc, oath_type_tag)`

Including `oath_type_tag` means a TradingOath and UptimeOath with identical fields do not collide. An Oathkeeper can run one TradingOath and one UptimeOath simultaneously.

---

## Signature binding

### ed25519 (DeepBook venue) -- REAL

`signature::verify_exec_binding` with `scheme = SCHEME_ED25519`:

1. Checks `pubkey` length is 32 bytes.
2. Derives Sui address from pubkey: `blake2b256(0x00 || pubkey)`.
3. Asserts derived address == `claimed_exec_addr` (binds signature to the specific key).
4. Calls `ed25519::ed25519_verify(sig, pubkey, preimage)`.

Preimage: `scope_hash || bcs(binding_nonce) || bcs(valid_from_ms) || bcs(valid_until_ms)`. All fields are known off-chain before the binding tx lands -- the exec wallet can pre-sign.

Replay protection: `valid_from_ms`/`valid_until_ms` define a signing window. The contract checks `valid_from_ms <= now_ms <= valid_until_ms`. `binding_nonce` is Oathkeeper-chosen and included in the scope hash, making each oath's binding message unique.

**Proven:** `v2_tests::ed25519_real_signature_verifies` uses an offline-generated keypair + preimage + real ed25519 signature as a test vector. This is not a mock.

### ecdsa_k1 (Hyperliquid venue) -- PASS-THROUGH (Day 16)

`scheme = SCHEME_ECDSA_K1` currently accepts any in-window call. Real verification (Day 16) will:

1. Wrap preimage with EIP-191: `keccak256("\x19Ethereum Signed Message:\n" || len || msg)`
2. Call `ecdsa_k1::secp256k1_ecrecover(sig, eip191_msg, hash_flag=0)`
3. Call `ecdsa_k1::decompress_pubkey` on the recovered 33-byte compressed pubkey
4. Derive EVM address: `keccak256(uncompressed[1..65])[12..32]`
5. Compare against `claimed_exec_addr` (as bytes; requires changing field type from `address` to `vector<u8>`)

The live e2e script runs venue=1 (ecdsa pass-through) to avoid requiring a real EVM keypair. The ed25519 path is proven separately in the Move test above.

---

## Multi-dimensional oath -- anti-fraud mechanics

A single-dimension oath (drawdown only) lets an Oathkeeper bond capital, do nothing for the epoch, and collect from Doubters. The oath tuple closes this:

- `max_drawdown_bps` -- mid-epoch trigger; `mark_breach` callable by anyone
- `min_trades >= 1` -- enforced at mint; no degenerate "sit idle" oaths
- `min_pnl_bps` -- end-of-epoch equity floor
- `min_volume_usdc` -- end-of-epoch activity floor

All four must hold for the oath to be Kept. Breach on any one dimension flips the status to Broken with the reason recorded.

---

## Deployed (testnet)

| Object | ID |
|--------|----|
| Package | `0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9` |
| Registry | `0x670b6d6e19fddcf7cf2d0877b8efb7b082be4a6a6c0f1cc3876a7ab238cd8838` |
| Mock USDC TreasuryCap | `0x44c876716bfc74fc1d8be5b15731c4c78f099fc2efd77fba77428c94c1b8aae5` |

E2E conservation verified live for both outcomes (SCENARIO=kept and SCENARIO=broken in `agent/src/e2e.ts`):

- Kept: oathkeeper +300, believer +1050, doubter -1500, platform +150, client 0. Sum = 0.
- Broken: oathkeeper -10000, believer -2000, doubter +1400, platform +5200, client +5400. Sum = 0.

---

## DeepBook integration (PLANNED -- Week 3)

### Venue: DeepBook V3 spot

Oathkeeper uses DeepBook V3 spot as the execution venue for the bound exec wallet's trades. DeepBook Predict (options/binary positions) is a separate protocol in a different Sui Overflow track; Oathkeeper does not touch it.

### BalanceManager pattern

Each exec wallet owns a `BalanceManager` shared object that holds funds for trading. Orders are placed via the BalanceManager. The exec wallet signature binding (above) proves the Oathkeeper controls the wallet that controls the BalanceManager.

`record_trade(oath_id, deepbook_tx_hash, ...)` will reference the actual DeepBook trade tx. The reconciliation indexer can query the BalanceManager's trade history to diff against on-chain attestations.

### SDK

`@mysten/deepbook-v3` is the canonical package. Week 3 agent runner integration target.

---

## Walrus integration (PLANNED -- Week 2)

`sealed_oath_text_root` is currently an opaque bytes argument passed at mint. The planned pipeline:

1. Oathkeeper encrypts oath text with Seal access policy (exec_addr + active status gate).
2. Oathkeeper uploads ciphertext to Walrus: `client.walrus.writeBlob(...)` returns a `blobId`.
3. `blobId` is committed as `sealed_oath_text_root` at mint.
4. Per-trade attestation blobs (Week 2 Day 13) use `WalrusFile` batch API.

Doubters read the sealed blob to confirm it exists and matches the on-chain commitment. Only the bound exec wallet can decrypt via Seal.

Cost note: Walrus storage requires WAL token (not just SUI). The Oathkeeper pays for their own sealed-oath-text blob. The agent server pays for per-trade attestation blobs.

---

## Seal integration (PLANNED -- Week 2)

Seal provides identity-based encryption with threshold key sharing (t-of-n) and on-chain Move-based access control.

Planned access condition:

```move
// Access-condition module (not yet written)
public fun can_decrypt_oath_text(
    requester: address,
    oath_id: ID,
    registry: &Registry,
): bool {
    let oath = registry::get_oath(registry, oath_id);
    requester == oath.exec_addr && oath.status == STATUS_ACTIVE
}
```

Seal key servers query this function via read-only call. If t-of-n servers approve, key shares are released and the exec wallet can decrypt the oath text.

This is a stronger trust model than TEE attestation: access policy is a publicly auditable Move contract; trust is distributed across t-of-n servers rather than a single enclave operator.

---

## Phase-0 expansion -- OathType enum

The `OathType` enum is shipped in v1. The per-vertical attestation adapter pattern (one Move module per vertical, dispatched from `oath::record_attestation`) is planned for Day 10 (Week 2 refactor).

| Variant | v1 status | Adapter |
|---------|-----------|---------|
| `TradingOath` | Full: `record_trade` entry, drawdown + end-of-epoch dims | Adapter refactor Day 10 |
| `UptimeOath` | Enum + mint gate, no adapter | Planned: HTTPS prober + ed25519-signed ping reports |
| `BehaviorOath` | Enum + mint gate, no adapter | Planned: off-chain judge, mock for hackathon |
| `ValidatorOath` | Rejected at mint | Roadmap only |
| `TreasuryOath` | Rejected at mint | Roadmap only |

The Day 17 cut-line from the sprint plan applies: if `UptimeOath` adapter is not testnet-functional by June 5, the enum variant stays but the adapter is dropped from the submission. Honest single-vertical beats half-shipped two-vertical.

---

## Sources

- [Sui object ownership](https://docs.sui.io/concepts/object-ownership)
- [Sui dynamic fields](https://docs.sui.io/concepts/dynamic-fields)
- [Hot Potato pattern (Move Book)](https://move-book.com/programmability/hot-potato-pattern/)
- [Sui ecdsa_k1 module](https://www.docs.sui.io/references/framework/sui_sui/ecdsa_k1)
- [Mysten Labs cross-chain signature guide](https://tech.mystenlabs.com/cryptography-in-sui-cross-chain-signature-verification/)
- [DeepBook V3 standards](https://docs.sui.io/standards/deepbook)
- [DeepBook V3 SDK](https://docs.sui.io/standards/deepbookv3-sdk)
- [Walrus TypeScript SDK](https://sdk.mystenlabs.com/walrus)
- [Seal docs](https://seal-docs.wal.app/)
