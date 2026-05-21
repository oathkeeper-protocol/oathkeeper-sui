/// The Oath object — a multi-dimensional commitment with bonded principal.
///
/// Lifecycle: Idle → Active → (Kept | Broken) → Settled.
/// Mint flow is atomic via the Hot Potato pattern: `start_epoch` returns a `ScopeReservation`
/// (zero abilities) that MUST be consumed in the same PTB by `bind_exec_wallet`. This makes
/// scope-reservation and exec-binding inseparable without shared-object reentrancy locks.
module oathkeeper::oath;

use std::option::Option;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::coin::Coin;
use oathkeeper::registry::Registry;

// === Errors ===
const EMinTradesTooLow: u64 = 0;
const EZeroBond: u64 = 1;
const ENotActive: u64 = 2;
const ENotBreached: u64 = 3;
const EAlreadySettled: u64 = 4;
const EEpochNotEnded: u64 = 5;
const EUnsupportedOathType: u64 = 6;
const EVenueAssetNotAllowed: u64 = 7;

// === Status constants ===
const STATUS_ACTIVE: u8 = 0;
const STATUS_KEPT: u8 = 1;
const STATUS_BROKEN: u8 = 2;
const STATUS_SETTLED: u8 = 3;

// === Venue constants ===
const VENUE_DEEPBOOK: u8 = 0;
const VENUE_HYPERLIQUID: u8 = 1;

// === OathType enum ===

/// Phase-0 multi-vertical dispatch tag. Only TradingOath ships full attestation in v1;
/// UptimeOath ships a real prober adapter; BehaviorOath ships a mock judge; Validator
/// and Treasury are enum-only and rejected at mint (roadmap signal).
public enum OathType has copy, drop, store {
    TradingOath,
    UptimeOath,
    BehaviorOath,
    ValidatorOath,
    TreasuryOath,
}

// === Oath dimensions ===

/// The multi-dimensional commitment tuple. All dimensions must hold for the oath to be Kept.
public struct OathDimensions has copy, drop, store {
    max_drawdown_bps: u64,
    min_trades: u64,
    min_pnl_bps: u64,
    min_volume_usdc: u64,
}

/// The execution scope tuple.
public struct StrategyScope has copy, drop, store {
    exec_addr: address,
    venue: u8,
    allowed_assets: vector<vector<u8>>,
    epoch_duration_ms: u64,
}

// === Oath object (shared) ===

public struct Oath<phantom T> has key {
    id: UID,
    promiser: address,
    oath_type: OathType,
    dims: OathDimensions,
    scope: StrategyScope,
    scope_hash: vector<u8>,
    bond: Balance<T>,
    /// Walrus blob ID for the Seal-encrypted oath text. Set at mint.
    sealed_oath_text_root: vector<u8>,
    /// Replay-protection nonce included in the exec signature preimage.
    binding_nonce: u64,
    epoch_start_ms: u64,
    epoch_end_ms: u64,
    /// Equity tracked in USDC units; updated by attestation.record_trade.
    starting_equity_usdc: u64,
    current_equity_usdc: u64,
    cumulative_volume_usdc: u64,
    trade_count: u64,
    /// Sum of all doubter open claim amounts. Bounded by `bond` value via invariant check.
    open_claims_usdc: u64,
    status: u8,
    breach_reason: Option<u8>,
}

// === Hot Potato ===

/// Returned by `start_epoch`, consumed by `bind_exec_wallet` in the same PTB.
/// HAS NO ABILITIES — cannot be stored, copied, or dropped. Enforces atomic mint.
public struct ScopeReservation {
    promiser: address,
    scope_hash: vector<u8>,
    bond_amount: u64,
    oath_type: OathType,
    dims: OathDimensions,
    scope: StrategyScope,
    sealed_oath_text_root: vector<u8>,
    binding_nonce: u64,
    starting_equity_usdc: u64,
}

// === Events ===

public struct OathMinted has copy, drop {
    oath_id: ID,
    promiser: address,
    oath_type: OathType,
    bond_amount: u64,
    epoch_end_ms: u64,
}

public struct OathSettled has copy, drop {
    oath_id: ID,
    final_status: u8,
    breach_reason: Option<u8>,
}

// === Mint flow (Hot Potato) ===

/// Step 1 of mint. Validates dims, reserves scope key, returns a Hot Potato.
public fun start_epoch<T>(
    registry: &mut Registry,
    oath_type: OathType,
    dims: OathDimensions,
    scope: StrategyScope,
    bond: Coin<T>,
    sealed_oath_text_root: vector<u8>,
    binding_nonce: u64,
    starting_equity_usdc: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): ScopeReservation { abort 0 }

/// Step 2 of mint. Verifies the exec signature, consumes the reservation, shares the Oath.
public fun bind_exec_wallet<T>(
    reservation: ScopeReservation,
    exec_signature: vector<u8>,
    exec_pubkey: vector<u8>,
    registry: &mut Registry,
    clock: &Clock,
    ctx: &mut TxContext,
) { abort 0 }

// === Lifecycle entry points ===

/// Permissionless mid-epoch breach trigger. Reverts unless current equity violates floor.
public entry fun mark_breach<T>(
    oath: &mut Oath<T>,
    clock: &Clock,
) { abort 0 }

/// Permissionless end-of-epoch settlement. Evaluates remaining dimensions, flips status,
/// distributes bond/stakes per economics module.
public entry fun settle_epoch<T>(
    oath: &mut Oath<T>,
    registry: &mut Registry,
    lp_pool: &mut oathkeeper::economics::LPPool<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) { abort 0 }

// === Accessors (read-only, for adapters / other modules / tests) ===

public fun id<T>(o: &Oath<T>): &UID { abort 0 }
public fun promiser<T>(o: &Oath<T>): address { abort 0 }
public fun oath_type<T>(o: &Oath<T>): OathType { abort 0 }
public fun status<T>(o: &Oath<T>): u8 { abort 0 }
public fun dims<T>(o: &Oath<T>): &OathDimensions { abort 0 }
public fun scope<T>(o: &Oath<T>): &StrategyScope { abort 0 }
public fun current_equity<T>(o: &Oath<T>): u64 { abort 0 }
public fun trade_count<T>(o: &Oath<T>): u64 { abort 0 }
public fun cumulative_volume<T>(o: &Oath<T>): u64 { abort 0 }
public fun bond_value<T>(o: &Oath<T>): u64 { abort 0 }
public fun open_claims<T>(o: &Oath<T>): u64 { abort 0 }
public fun epoch_end_ms<T>(o: &Oath<T>): u64 { abort 0 }
public fun exec_addr<T>(o: &Oath<T>): address { abort 0 }

// === Package-internal mutators (used by attestation, doubter, economics) ===

public(package) fun record_equity_update<T>(
    oath: &mut Oath<T>,
    new_equity: u64,
    notional: u64,
) { abort 0 }

public(package) fun add_open_claim<T>(oath: &mut Oath<T>, amount: u64) { abort 0 }
public(package) fun consume_bond<T>(oath: &mut Oath<T>, amount: u64): Balance<T> { abort 0 }
public(package) fun split_bond<T>(oath: &mut Oath<T>, amount: u64): Balance<T> { abort 0 }
public(package) fun set_status<T>(oath: &mut Oath<T>, status: u8, reason: Option<u8>) { abort 0 }

// === OathType constructors (avoid leaking enum literal across modules) ===

public fun trading_oath(): OathType { abort 0 }
public fun uptime_oath(): OathType { abort 0 }
public fun behavior_oath(): OathType { abort 0 }
public fun validator_oath(): OathType { abort 0 }
public fun treasury_oath(): OathType { abort 0 }
