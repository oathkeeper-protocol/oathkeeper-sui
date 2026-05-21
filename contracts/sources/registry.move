/// Scope-uniqueness + exec-wallet binding registry.
///
/// One shared `Registry` object owns two tables:
///   - `scope_table:  Table<ScopeKey, ID>`  enforces `(promiser, scope_hash)` uniqueness.
///   - `exec_table:   Table<address, ID>`   enforces single active oath per exec_addr.
///
/// Oath objects are stored as dynamic_object_field on the Registry so Sui Explorer +
/// indexers can resolve them by ID (see ARCHITECTURE.md "dynamic_object_field" note).
module oathkeeper::registry;

use sui::table::Table;

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
}

// === Init ===

fun init(ctx: &mut TxContext) { abort 0 }

// === Scope-uniqueness ===

public fun has_scope(registry: &Registry, promiser: address, scope_hash: vector<u8>): bool { abort 0 }

public(package) fun reserve_scope(
    registry: &mut Registry,
    promiser: address,
    scope_hash: vector<u8>,
    oath_id: ID,
) { abort 0 }

public(package) fun release_scope(
    registry: &mut Registry,
    promiser: address,
    scope_hash: vector<u8>,
) { abort 0 }

// === Exec-wallet binding ===

public fun is_exec_bound(registry: &Registry, exec_addr: address): bool { abort 0 }

public(package) fun bind_exec(
    registry: &mut Registry,
    exec_addr: address,
    oath_id: ID,
) { abort 0 }

public(package) fun unbind_exec(registry: &mut Registry, exec_addr: address) { abort 0 }

// === Scope-hash helper ===

/// Deterministic hash over (exec_addr, venue, allowed_assets, epoch_duration, oath_dims, oath_type_tag).
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
): vector<u8> { abort 0 }
