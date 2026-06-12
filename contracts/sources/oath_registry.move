/// Scope-uniqueness + exec-wallet binding registry.
///
/// One shared `Registry` object owns two tables:
///   - `scope_table:  Table<ScopeKey, ID>`  enforces `(promiser, scope_hash)` uniqueness.
///   - `exec_table:   Table<address, ID>`   enforces single active oath per exec_addr.
module oathkeeper::oath_registry;

use std::bcs;
use sui::hash;
use sui::table::{Self, Table};

// === Errors ===
const EScopeAlreadyRegistered: u64 = 0;
const EExecWalletBound: u64 = 1;
const EScopeNotFound: u64 = 2;
const EExecNotBound: u64 = 3;

// === Types ===

/// Composite key for scope-uniqueness lookup.
public struct ScopeKey has copy, drop, store {
    promiser: address,
    scope_hash: vector<u8>,
}

/// Singleton shared object. Created once at module publish via `init`.
public struct Registry has key {
    id: UID,
    scope_table: Table<ScopeKey, ID>,
    exec_table: Table<address, ID>,
    platform_treasury: address,
}

// === Init ===

fun init(ctx: &mut TxContext) {
    let registry = Registry {
        id: object::new(ctx),
        scope_table: table::new<ScopeKey, ID>(ctx),
        exec_table: table::new<address, ID>(ctx),
        platform_treasury: tx_context::sender(ctx),
    };
    transfer::share_object(registry);
}

// === Platform treasury ===

public fun platform_treasury(registry: &Registry): address { registry.platform_treasury }

// === Scope-uniqueness ===

public fun has_scope(registry: &Registry, promiser: address, scope_hash: vector<u8>): bool {
    table::contains(&registry.scope_table, ScopeKey { promiser, scope_hash })
}

public(package) fun reserve_scope(
    registry: &mut Registry,
    promiser: address,
    scope_hash: vector<u8>,
    oath_id: ID,
) {
    let key = ScopeKey { promiser, scope_hash };
    assert!(!table::contains(&registry.scope_table, key), EScopeAlreadyRegistered);
    table::add(&mut registry.scope_table, key, oath_id);
}

public(package) fun release_scope(
    registry: &mut Registry,
    promiser: address,
    scope_hash: vector<u8>,
) {
    let key = ScopeKey { promiser, scope_hash };
    assert!(table::contains(&registry.scope_table, key), EScopeNotFound);
    table::remove(&mut registry.scope_table, key);
}

// === Exec-wallet binding ===

public fun is_exec_bound(registry: &Registry, exec_addr: address): bool {
    table::contains(&registry.exec_table, exec_addr)
}

public(package) fun bind_exec(
    registry: &mut Registry,
    exec_addr: address,
    oath_id: ID,
) {
    assert!(!table::contains(&registry.exec_table, exec_addr), EExecWalletBound);
    table::add(&mut registry.exec_table, exec_addr, oath_id);
}

public(package) fun unbind_exec(registry: &mut Registry, exec_addr: address) {
    assert!(table::contains(&registry.exec_table, exec_addr), EExecNotBound);
    table::remove(&mut registry.exec_table, exec_addr);
}

// === Test-only init ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

// === Scope-hash helper ===

/// Deterministic keccak256 over BCS-serialized preimage:
/// (exec_addr, venue, allowed_assets, epoch_duration, oath_dims..., oath_type_tag).
/// `oath_type_tag` ensures a TradingOath and UptimeOath with otherwise-identical fields don't collide.
public fun compute_scope_hash(
    exec_addr: address,
    venue: u8,
    allowed_assets: vector<vector<u8>>,
    epoch_duration_ms: u64,
    max_drawdown_bps: u64,
    min_trades: u64,
    min_pnl_bps: u64,
    min_volume_usdc: u64,
    oath_type_tag: u8,
): vector<u8> {
    let mut preimage = vector::empty<u8>();
    vector::append(&mut preimage, bcs::to_bytes(&exec_addr));
    vector::push_back(&mut preimage, venue);
    vector::append(&mut preimage, bcs::to_bytes(&allowed_assets));
    vector::append(&mut preimage, bcs::to_bytes(&epoch_duration_ms));
    vector::append(&mut preimage, bcs::to_bytes(&max_drawdown_bps));
    vector::append(&mut preimage, bcs::to_bytes(&min_trades));
    vector::append(&mut preimage, bcs::to_bytes(&min_pnl_bps));
    vector::append(&mut preimage, bcs::to_bytes(&min_volume_usdc));
    vector::push_back(&mut preimage, oath_type_tag);
    hash::keccak256(&preimage)
}
