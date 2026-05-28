/// The Oath object — an onchain SLA with bonded capital, open-market pricing, and
/// automatic zero-arbitration settlement.
///
/// v2 economics: 5 roles (Oathkeeper, Client, Believer, Doubter, Platform).
/// Stakes pool into the Oath's Balance fields, not into individual Positions.
/// Settlement splits loser stakes 10/20/70 (Platform/Secondary/Winners).
///
/// Lifecycle: Active → (Kept | Broken) → Settled.
/// Mint flow: Hot Potato pattern — start_epoch returns ScopeReservation<T> (zero
/// abilities, must be consumed in the same PTB by bind_exec_wallet).
module oathkeeper::oath;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use oathkeeper::registry::{Self, Registry};
use oathkeeper::economics;
use oathkeeper::signature;

// === Errors ===
const EMinTradesTooLow: u64 = 0;
const EZeroBond: u64 = 1;
const ENotActive: u64 = 2;
const ENotBreached: u64 = 3;
const EAlreadySettled: u64 = 4;
const EEpochNotEnded: u64 = 5;
const EUnsupportedOathType: u64 = 6;
const EVenueUnknown: u64 = 8;
const EZeroEpochDuration: u64 = 9;
const ENoAllowedAssets: u64 = 10;
const EZeroStartingEquity: u64 = 11;
const EDrawdownNotBreached: u64 = 12;
const ESignatureInvalid: u64 = 13;
const EScopeAlreadyReservedEarlyCheck: u64 = 14;
const EZeroClientClaim: u64 = 15;
const EClientClaimExceedsBond: u64 = 16;

// === Status constants ===
const STATUS_ACTIVE: u8 = 0;
const STATUS_KEPT: u8 = 1;
const STATUS_BROKEN: u8 = 2;
const STATUS_SETTLED: u8 = 3;

// === Breach reason constants ===
const BREACH_DRAWDOWN: u8 = 0;
const BREACH_MIN_TRADES: u8 = 1;
const BREACH_MIN_PNL: u8 = 2;
const BREACH_MIN_VOLUME: u8 = 3;

// === Venue constants ===
const VENUE_DEEPBOOK: u8 = 0;
const VENUE_HYPERLIQUID: u8 = 1;

// === Signature scheme (mirrors signature module) ===
const SCHEME_ED25519: u8 = 0;
const SCHEME_ECDSA_K1: u8 = 1;

// === OathType enum ===

public enum OathType has copy, drop, store {
    TradingOath,
    UptimeOath,
    BehaviorOath,
    ValidatorOath,
    TreasuryOath,
}

// === Oath dimensions ===

public struct OathDimensions has copy, drop, store {
    max_drawdown_bps: u64,
    min_trades: u64,
    min_pnl_bps: u64,
    min_volume_usdc: u64,
}

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
    // --- Capital ---
    bond: Balance<T>,
    believer_pool: Balance<T>,
    doubter_pool: Balance<T>,
    /// After settlement, winners claim from here (original stakes + 70% loser stakes).
    winner_payout_pool: Balance<T>,
    // --- Client SLA ---
    client: address,
    client_claim: u64,
    // --- Pool tracking ---
    total_believer_stakes: u64,
    total_doubter_stakes: u64,
    /// Decremented as each winner claims; drives pro-rata math.
    winner_stakes_remaining: u64,
    // --- Oath metadata ---
    sealed_oath_text_root: vector<u8>,
    binding_nonce: u64,
    epoch_start_ms: u64,
    epoch_end_ms: u64,
    // --- Performance tracking ---
    starting_equity_usdc: u64,
    current_equity_usdc: u64,
    cumulative_volume_usdc: u64,
    trade_count: u64,
    // --- State ---
    status: u8,
    breach_reason: Option<u8>,
}

// === Hot Potato ===

public struct ScopeReservation<phantom T> {
    promiser: address,
    scope_hash: vector<u8>,
    bond: Balance<T>,
    oath_type: OathType,
    dims: OathDimensions,
    scope: StrategyScope,
    client: address,
    client_claim: u64,
    sealed_oath_text_root: vector<u8>,
    binding_nonce: u64,
    starting_equity_usdc: u64,
}

// === Events ===

public struct OathMinted has copy, drop {
    oath_id: ID,
    promiser: address,
    client: address,
    oath_type: OathType,
    bond_amount: u64,
    client_claim: u64,
    epoch_end_ms: u64,
}

public struct OathSettled has copy, drop {
    oath_id: ID,
    final_status: u8,
    breach_reason: Option<u8>,
    bond_to_promiser: u64,
    bond_to_client: u64,
    bond_residual_to_platform: u64,
    loser_to_platform: u64,
    loser_to_secondary: u64,
    loser_to_winners: u64,
}

public struct OathBroken has copy, drop {
    oath_id: ID,
    breach_reason: u8,
    equity_at_breach: u64,
    trade_count_at_breach: u64,
}

// === Mint flow (Hot Potato) ===

public fun start_epoch<T>(
    registry: &mut Registry,
    oath_type: OathType,
    dims: OathDimensions,
    scope: StrategyScope,
    bond: Coin<T>,
    client: address,
    client_claim: u64,
    sealed_oath_text_root: vector<u8>,
    binding_nonce: u64,
    starting_equity_usdc: u64,
    _clock: &Clock,
    ctx: &mut TxContext,
): ScopeReservation<T> {
    assert!(dims.min_trades >= 1, EMinTradesTooLow);
    let bond_value = coin::value(&bond);
    assert!(bond_value > 0, EZeroBond);
    assert!(starting_equity_usdc > 0, EZeroStartingEquity);
    assert!(client_claim > 0, EZeroClientClaim);
    assert!(client_claim <= bond_value, EClientClaimExceedsBond);
    assert!(
        scope.venue == VENUE_DEEPBOOK || scope.venue == VENUE_HYPERLIQUID,
        EVenueUnknown,
    );
    assert!(scope.epoch_duration_ms > 0, EZeroEpochDuration);
    assert!(vector::length(&scope.allowed_assets) >= 1, ENoAllowedAssets);

    let tag = oath_type_tag(oath_type);
    assert!(
        tag != oath_type_tag(OathType::ValidatorOath)
            && tag != oath_type_tag(OathType::TreasuryOath),
        EUnsupportedOathType,
    );

    let scope_hash = registry::compute_scope_hash(
        scope.exec_addr, scope.venue, scope.allowed_assets,
        scope.epoch_duration_ms, dims.max_drawdown_bps, dims.min_trades,
        dims.min_pnl_bps, dims.min_volume_usdc, tag,
    );

    let promiser = tx_context::sender(ctx);
    assert!(
        !registry::has_scope(registry, promiser, scope_hash),
        EScopeAlreadyReservedEarlyCheck,
    );

    ScopeReservation<T> {
        promiser,
        scope_hash,
        bond: coin::into_balance(bond),
        oath_type,
        dims,
        scope,
        client,
        client_claim,
        sealed_oath_text_root,
        binding_nonce,
        starting_equity_usdc,
    }
}

public fun bind_exec_wallet<T>(
    reservation: ScopeReservation<T>,
    exec_signature: vector<u8>,
    exec_pubkey: vector<u8>,
    registry: &mut Registry,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let ScopeReservation<T> {
        promiser, scope_hash, bond, oath_type, dims, scope,
        client, client_claim, sealed_oath_text_root, binding_nonce,
        starting_equity_usdc,
    } = reservation;

    let now_ms = clock::timestamp_ms(clock);
    let epoch_end_ms = now_ms + scope.epoch_duration_ms;

    let scheme = if (scope.venue == VENUE_DEEPBOOK) { SCHEME_ED25519 } else { SCHEME_ECDSA_K1 };

    let ok = signature::verify_exec_binding(
        scheme, exec_pubkey, exec_signature, scope.exec_addr,
        scope_hash, now_ms, binding_nonce, now_ms, epoch_end_ms, now_ms,
    );
    assert!(ok, ESignatureInvalid);

    let bond_amount = balance::value(&bond);
    let oath = Oath<T> {
        id: object::new(ctx),
        promiser,
        oath_type,
        dims,
        scope,
        scope_hash,
        bond,
        believer_pool: balance::zero<T>(),
        doubter_pool: balance::zero<T>(),
        winner_payout_pool: balance::zero<T>(),
        client,
        client_claim,
        total_believer_stakes: 0,
        total_doubter_stakes: 0,
        winner_stakes_remaining: 0,
        sealed_oath_text_root,
        binding_nonce,
        epoch_start_ms: now_ms,
        epoch_end_ms,
        starting_equity_usdc,
        current_equity_usdc: starting_equity_usdc,
        cumulative_volume_usdc: 0,
        trade_count: 0,
        status: STATUS_ACTIVE,
        breach_reason: option::none<u8>(),
    };

    let oath_id = object::id(&oath);
    registry::reserve_scope(registry, promiser, oath.scope_hash, oath_id);
    registry::bind_exec(registry, oath.scope.exec_addr, oath_id);

    event::emit(OathMinted {
        oath_id, promiser, client, oath_type, bond_amount, client_claim, epoch_end_ms,
    });

    transfer::share_object(oath);
}

// === Lifecycle ===

public entry fun mark_breach<T>(oath: &mut Oath<T>, _clock: &Clock) {
    assert!(oath.status == STATUS_ACTIVE, ENotActive);
    let floor = (((oath.starting_equity_usdc as u128)
        * ((10000 - oath.dims.max_drawdown_bps) as u128) / 10000) as u64);
    assert!(oath.current_equity_usdc < floor, EDrawdownNotBreached);

    oath.status = STATUS_BROKEN;
    oath.breach_reason = option::some(BREACH_DRAWDOWN);
    event::emit(OathBroken {
        oath_id: object::id(oath),
        breach_reason: BREACH_DRAWDOWN,
        equity_at_breach: oath.current_equity_usdc,
        trade_count_at_breach: oath.trade_count,
    });
}

/// === Conservation invariant ===
///
/// Inflows  = bond + Σ believer_stakes + Σ doubter_stakes
/// Let B = bond, C = client_claim, BS = total_believer_stakes, DS = total_doubter_stakes.
///
/// **Kept:**
///   Bond: B → Oathkeeper
///   Loser pool = DS (Doubter stakes). Split: 10% Platform, 20% Oathkeeper, 70% → winner pool.
///   Winner pool = BS + 0.7*DS → Believers claim pro-rata.
///   Outflows = B + 0.1*DS + 0.2*DS + BS + 0.7*DS = B + DS + BS ✓
///
/// **Broken:**
///   Bond: C → Client, (B-C) → Platform (residual penalty, intentional per v2 design doc).
///   Loser pool = BS (Believer stakes). Split: 10% Platform, 20% Client, 70% → winner pool.
///   Winner pool = DS + 0.7*BS → Doubters claim pro-rata.
///   Outflows = C + (B-C) + 0.1*BS + 0.2*BS + DS + 0.7*BS = B + BS + DS ✓
public entry fun settle_epoch<T>(
    oath: &mut Oath<T>,
    registry: &mut Registry,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oath.status != STATUS_SETTLED, EAlreadySettled);
    assert!(clock::timestamp_ms(clock) >= oath.epoch_end_ms, EEpochNotEnded);

    if (oath.status == STATUS_ACTIVE) {
        if (oath.trade_count < oath.dims.min_trades) {
            oath.breach_reason = option::some(BREACH_MIN_TRADES);
            oath.status = STATUS_BROKEN;
        } else if (oath.cumulative_volume_usdc < oath.dims.min_volume_usdc) {
            oath.breach_reason = option::some(BREACH_MIN_VOLUME);
            oath.status = STATUS_BROKEN;
        } else {
            let pnl_floor = (((oath.starting_equity_usdc as u128)
                * ((10000 + oath.dims.min_pnl_bps) as u128) / 10000) as u64);
            if (oath.current_equity_usdc < pnl_floor) {
                oath.breach_reason = option::some(BREACH_MIN_PNL);
                oath.status = STATUS_BROKEN;
            } else {
                oath.status = STATUS_KEPT;
            }
        }
    };

    let platform = registry::platform_treasury(registry);
    let mut bond_to_promiser = 0u64;
    let mut bond_to_client = 0u64;
    let mut bond_residual_to_platform = 0u64;

    if (oath.status == STATUS_KEPT) {
        // Bond → Oathkeeper.
        let bond_bal = balance::withdraw_all(&mut oath.bond);
        bond_to_promiser = balance::value(&bond_bal);
        transfer::public_transfer(coin::from_balance(bond_bal, ctx), oath.promiser);

        // Loser = Doubter pool. Split 10/20/70.
        let loser_total = balance::value(&oath.doubter_pool);
        let (plat_amt, sec_amt, win_amt) = economics::compute_split(loser_total);
        if (plat_amt > 0) {
            transfer::public_transfer(
                coin::from_balance(balance::split(&mut oath.doubter_pool, plat_amt), ctx),
                platform,
            );
        };
        if (sec_amt > 0) {
            transfer::public_transfer(
                coin::from_balance(balance::split(&mut oath.doubter_pool, sec_amt), ctx),
                oath.promiser,
            );
        };
        // Remaining doubter_pool (70%) + entire believer_pool → winner_payout_pool.
        let remaining_loser = balance::withdraw_all(&mut oath.doubter_pool);
        balance::join(&mut oath.winner_payout_pool, remaining_loser);
        let winners_own = balance::withdraw_all(&mut oath.believer_pool);
        balance::join(&mut oath.winner_payout_pool, winners_own);
        oath.winner_stakes_remaining = oath.total_believer_stakes;
    } else {
        // STATUS_BROKEN.
        // Bond: client_claim → Client, residual → Platform.
        let bond_val = balance::value(&oath.bond);
        let claim = if (oath.client_claim <= bond_val) { oath.client_claim } else { bond_val };
        if (claim > 0) {
            bond_to_client = claim;
            transfer::public_transfer(
                coin::from_balance(balance::split(&mut oath.bond, claim), ctx),
                oath.client,
            );
        };
        let residual = balance::value(&oath.bond);
        if (residual > 0) {
            bond_residual_to_platform = residual;
            transfer::public_transfer(
                coin::from_balance(balance::withdraw_all(&mut oath.bond), ctx),
                platform,
            );
        };

        // Loser = Believer pool. Split 10/20/70.
        let loser_total = balance::value(&oath.believer_pool);
        let (plat_amt, sec_amt, _win_amt) = economics::compute_split(loser_total);
        if (plat_amt > 0) {
            transfer::public_transfer(
                coin::from_balance(balance::split(&mut oath.believer_pool, plat_amt), ctx),
                platform,
            );
        };
        if (sec_amt > 0) {
            transfer::public_transfer(
                coin::from_balance(balance::split(&mut oath.believer_pool, sec_amt), ctx),
                oath.client,
            );
        };
        // Remaining believer_pool (70%) + entire doubter_pool → winner_payout_pool.
        let remaining_loser = balance::withdraw_all(&mut oath.believer_pool);
        balance::join(&mut oath.winner_payout_pool, remaining_loser);
        let winners_own = balance::withdraw_all(&mut oath.doubter_pool);
        balance::join(&mut oath.winner_payout_pool, winners_own);
        oath.winner_stakes_remaining = oath.total_doubter_stakes;
    };

    registry::release_scope(registry, oath.promiser, oath.scope_hash);
    registry::unbind_exec(registry, oath.scope.exec_addr);

    let loser_total_for_event = if (oath.status == STATUS_KEPT) {
        oath.total_doubter_stakes
    } else {
        oath.total_believer_stakes
    };
    let (plat_evt, sec_evt, win_evt) = economics::compute_split(loser_total_for_event);

    let final_status = oath.status;
    oath.status = STATUS_SETTLED;

    event::emit(OathSettled {
        oath_id: object::id(oath),
        final_status,
        breach_reason: oath.breach_reason,
        bond_to_promiser,
        bond_to_client,
        bond_residual_to_platform,
        loser_to_platform: plat_evt,
        loser_to_secondary: sec_evt,
        loser_to_winners: win_evt,
    });
}

// === Accessors ===

public fun id<T>(o: &Oath<T>): &UID { &o.id }
public fun promiser<T>(o: &Oath<T>): address { o.promiser }
public fun client<T>(o: &Oath<T>): address { o.client }
public fun client_claim<T>(o: &Oath<T>): u64 { o.client_claim }
public fun oath_type<T>(o: &Oath<T>): OathType { o.oath_type }
public fun status<T>(o: &Oath<T>): u8 { o.status }
public fun dims<T>(o: &Oath<T>): &OathDimensions { &o.dims }
public fun scope<T>(o: &Oath<T>): &StrategyScope { &o.scope }
public fun current_equity<T>(o: &Oath<T>): u64 { o.current_equity_usdc }
public fun starting_equity<T>(o: &Oath<T>): u64 { o.starting_equity_usdc }
public fun trade_count<T>(o: &Oath<T>): u64 { o.trade_count }
public fun cumulative_volume<T>(o: &Oath<T>): u64 { o.cumulative_volume_usdc }
public fun bond_value<T>(o: &Oath<T>): u64 { balance::value(&o.bond) }
public fun epoch_end_ms<T>(o: &Oath<T>): u64 { o.epoch_end_ms }
public fun epoch_start_ms<T>(o: &Oath<T>): u64 { o.epoch_start_ms }
public fun exec_addr<T>(o: &Oath<T>): address { o.scope.exec_addr }
public fun breach_reason<T>(o: &Oath<T>): Option<u8> { o.breach_reason }
public fun scope_hash<T>(o: &Oath<T>): vector<u8> { o.scope_hash }
public fun total_believer_stakes<T>(o: &Oath<T>): u64 { o.total_believer_stakes }
public fun total_doubter_stakes<T>(o: &Oath<T>): u64 { o.total_doubter_stakes }
public fun winner_payout_pool_value<T>(o: &Oath<T>): u64 { balance::value(&o.winner_payout_pool) }
public fun winner_stakes_remaining<T>(o: &Oath<T>): u64 { o.winner_stakes_remaining }

public fun max_drawdown_bps(d: &OathDimensions): u64 { d.max_drawdown_bps }
public fun min_trades(d: &OathDimensions): u64 { d.min_trades }
public fun min_pnl_bps(d: &OathDimensions): u64 { d.min_pnl_bps }
public fun min_volume_usdc(d: &OathDimensions): u64 { d.min_volume_usdc }
public fun scope_exec_addr(s: &StrategyScope): address { s.exec_addr }
public fun scope_venue(s: &StrategyScope): u8 { s.venue }
public fun scope_allowed_assets(s: &StrategyScope): &vector<vector<u8>> { &s.allowed_assets }
public fun scope_epoch_duration_ms(s: &StrategyScope): u64 { s.epoch_duration_ms }

public fun status_active(): u8 { STATUS_ACTIVE }
public fun status_kept(): u8 { STATUS_KEPT }
public fun status_broken(): u8 { STATUS_BROKEN }
public fun status_settled(): u8 { STATUS_SETTLED }

public fun new_dimensions(
    max_drawdown_bps: u64, min_trades: u64, min_pnl_bps: u64, min_volume_usdc: u64,
): OathDimensions {
    OathDimensions { max_drawdown_bps, min_trades, min_pnl_bps, min_volume_usdc }
}

public fun new_scope(
    exec_addr: address, venue: u8, allowed_assets: vector<vector<u8>>, epoch_duration_ms: u64,
): StrategyScope {
    StrategyScope { exec_addr, venue, allowed_assets, epoch_duration_ms }
}

// === Package-internal mutators ===

public(package) fun record_equity_update<T>(
    oath: &mut Oath<T>, new_equity: u64, notional: u64,
) {
    oath.current_equity_usdc = new_equity;
    oath.cumulative_volume_usdc = oath.cumulative_volume_usdc + notional;
    oath.trade_count = oath.trade_count + 1;
}

public(package) fun add_believer_stake<T>(oath: &mut Oath<T>, stake: Balance<T>) {
    let amount = balance::value(&stake);
    balance::join(&mut oath.believer_pool, stake);
    oath.total_believer_stakes = oath.total_believer_stakes + amount;
}

public(package) fun add_doubter_stake<T>(oath: &mut Oath<T>, stake: Balance<T>) {
    let amount = balance::value(&stake);
    balance::join(&mut oath.doubter_pool, stake);
    oath.total_doubter_stakes = oath.total_doubter_stakes + amount;
}

/// Pull a winner's pro-rata share from the payout pool. Uses the proportional-drain
/// pattern: share = pool_balance * my_stake / remaining_winner_stakes.
public(package) fun claim_winner_share<T>(
    oath: &mut Oath<T>, my_stake: u64,
): Balance<T> {
    let pool_val = balance::value(&oath.winner_payout_pool);
    let remaining = oath.winner_stakes_remaining;
    let share = if (remaining == my_stake) {
        pool_val
    } else {
        (((my_stake as u128) * (pool_val as u128) / (remaining as u128)) as u64)
    };
    oath.winner_stakes_remaining = remaining - my_stake;
    balance::split(&mut oath.winner_payout_pool, share)
}

public(package) fun set_status<T>(oath: &mut Oath<T>, status: u8, reason: Option<u8>) {
    oath.status = status;
    oath.breach_reason = reason;
}

// === OathType constructors ===

public fun trading_oath(): OathType { OathType::TradingOath }
public fun uptime_oath(): OathType { OathType::UptimeOath }
public fun behavior_oath(): OathType { OathType::BehaviorOath }
public fun validator_oath(): OathType { OathType::ValidatorOath }
public fun treasury_oath(): OathType { OathType::TreasuryOath }

fun oath_type_tag(t: OathType): u8 {
    match (t) {
        OathType::TradingOath => 0,
        OathType::UptimeOath => 1,
        OathType::BehaviorOath => 2,
        OathType::ValidatorOath => 3,
        OathType::TreasuryOath => 4,
    }
}
