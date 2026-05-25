/// The Oath object — a multi-dimensional commitment with bonded principal.
///
/// Lifecycle: Idle → Active → (Kept | Broken) → Settled.
/// Mint flow is atomic via the Hot Potato pattern: `start_epoch` returns a `ScopeReservation`
/// (zero abilities) that MUST be consumed in the same PTB by `bind_exec_wallet`. This makes
/// scope-reservation and exec-binding inseparable without shared-object reentrancy locks.
module oathkeeper::oath;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use oathkeeper::registry::{Self, Registry};
use oathkeeper::economics::{Self, LPPool};
use oathkeeper::signature;

// === Errors ===
const EMinTradesTooLow: u64 = 0;
const EZeroBond: u64 = 1;
const ENotActive: u64 = 2;
const ENotBreached: u64 = 3;
const EAlreadySettled: u64 = 4;
const EEpochNotEnded: u64 = 5;
const EUnsupportedOathType: u64 = 6;
const EVenueAssetNotAllowed: u64 = 7;
const EVenueUnknown: u64 = 8;
const EZeroEpochDuration: u64 = 9;
const ENoAllowedAssets: u64 = 10;
const EZeroStartingEquity: u64 = 11;
const EDrawdownNotBreached: u64 = 12;
const ESignatureInvalid: u64 = 13;
const EScopeAlreadyReservedEarlyCheck: u64 = 14;

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

// === Signature scheme constants (mirrors `signature` module) ===
const SCHEME_ED25519: u8 = 0;
const SCHEME_ECDSA_K1: u8 = 1;

// === Binding window (ms) — caller-supplied window must lie within this slack on either side ===
// (Not enforced here; the signature module enforces valid_from/valid_until against `now`.)

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
/// If `drop` ever leaks in here, the atomicity guarantee silently dies — explicit canary.
public struct ScopeReservation<phantom T> {
    promiser: address,
    scope_hash: vector<u8>,
    bond: Balance<T>,
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
    bond_to_promiser: u64,
    residual_to_lp: u64,
}

public struct OathBroken has copy, drop {
    oath_id: ID,
    breach_reason: u8,
    equity_at_breach: u64,
    trade_count_at_breach: u64,
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
    _clock: &Clock,
    ctx: &mut TxContext,
): ScopeReservation<T> {
    // --- Dimensional sanity ---
    // min_trades >= 1 is the fence against the dead-trader exploit. See CLAUDE.md
    // "Multi-dimensional oath" section.
    assert!(dims.min_trades >= 1, EMinTradesTooLow);
    assert!(coin::value(&bond) > 0, EZeroBond);
    assert!(starting_equity_usdc > 0, EZeroStartingEquity);

    // --- Scope sanity ---
    assert!(
        scope.venue == VENUE_DEEPBOOK || scope.venue == VENUE_HYPERLIQUID,
        EVenueUnknown,
    );
    assert!(scope.epoch_duration_ms > 0, EZeroEpochDuration);
    assert!(vector::length(&scope.allowed_assets) >= 1, ENoAllowedAssets);

    // --- Reject roadmap-only OathTypes ---
    let tag = oath_type_tag(oath_type);
    assert!(
        tag != oath_type_tag(OathType::ValidatorOath)
            && tag != oath_type_tag(OathType::TreasuryOath),
        EUnsupportedOathType,
    );

    // --- Scope hash + reservation ---
    let scope_hash = registry::compute_scope_hash(
        scope.exec_addr,
        scope.venue,
        scope.allowed_assets,
        scope.epoch_duration_ms,
        dims.max_drawdown_bps,
        dims.min_trades,
        dims.min_pnl_bps,
        dims.min_volume_usdc,
        tag,
    );

    let promiser = tx_context::sender(ctx);

    // The reservation must be backed by a real registry entry; we use a placeholder
    // OathId (the registry table maps to ID, but the Oath isn't constructed yet). We
    // can't compute the future Oath ID without consuming the hot potato — so we reserve
    // with a sentinel ID derived from the promiser+scope_hash. The Registry replaces
    // this entry with the real Oath ID on `bind_exec_wallet`. The Hot Potato makes the
    // window between these two operations a single atomic PTB.
    //
    // Simpler alternative used here: reserve with the *sender's* address derived ID is
    // not available; instead we delay table insertion to `bind_exec_wallet`. The
    // `start_epoch` call only validates the scope is currently free; the Hot Potato's
    // singleton type makes double-mint within the same PTB impossible. Race with another
    // PTB is closed by `bind_exec_wallet` re-checking + inserting under the same lock.
    assert!(
        !registry::has_scope(registry, promiser, scope_hash),
        EScopeAlreadyReservedEarlyCheck,
    );

    let bond_balance = coin::into_balance(bond);

    ScopeReservation<T> {
        promiser,
        scope_hash,
        bond: bond_balance,
        oath_type,
        dims,
        scope,
        sealed_oath_text_root,
        binding_nonce,
        starting_equity_usdc,
    }
}

/// Step 2 of mint. Verifies the exec signature, consumes the reservation, shares the Oath.
public fun bind_exec_wallet<T>(
    reservation: ScopeReservation<T>,
    exec_signature: vector<u8>,
    exec_pubkey: vector<u8>,
    registry: &mut Registry,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let ScopeReservation<T> {
        promiser,
        scope_hash,
        bond,
        oath_type,
        dims,
        scope,
        sealed_oath_text_root,
        binding_nonce,
        starting_equity_usdc,
    } = reservation;

    let now_ms = clock::timestamp_ms(clock);
    let epoch_end_ms = now_ms + scope.epoch_duration_ms;

    // Scheme selection from venue: DeepBook → ed25519, Hyperliquid → ecdsa_k1.
    let scheme = if (scope.venue == VENUE_DEEPBOOK) {
        SCHEME_ED25519
    } else {
        SCHEME_ECDSA_K1
    };

    // Verify the exec wallet signed the canonical binding preimage. The signature window
    // mirrors the epoch window in v1 (binding is valid from `now` until epoch_end).
    let ok = signature::verify_exec_binding(
        scheme,
        exec_pubkey,
        exec_signature,
        scope.exec_addr,
        scope_hash,
        /* epoch_id */ now_ms,
        binding_nonce,
        /* valid_from_ms */ now_ms,
        /* valid_until_ms */ epoch_end_ms,
        now_ms,
    );
    assert!(ok, ESignatureInvalid);

    // Construct the Oath.
    let bond_amount = balance::value(&bond);
    let oath = Oath<T> {
        id: object::new(ctx),
        promiser,
        oath_type,
        dims,
        scope,
        scope_hash,
        bond,
        sealed_oath_text_root,
        binding_nonce,
        epoch_start_ms: now_ms,
        epoch_end_ms,
        starting_equity_usdc,
        current_equity_usdc: starting_equity_usdc,
        cumulative_volume_usdc: 0,
        trade_count: 0,
        open_claims_usdc: 0,
        status: STATUS_ACTIVE,
        breach_reason: option::none<u8>(),
    };

    let oath_id = object::id(&oath);

    // Finalize the registry entries (scope + exec) under the real Oath ID. Aborts if
    // another PTB raced ahead and reserved either key.
    registry::reserve_scope(registry, promiser, oath.scope_hash, oath_id);
    registry::bind_exec(registry, oath.scope.exec_addr, oath_id);

    event::emit(OathMinted {
        oath_id,
        promiser,
        oath_type,
        bond_amount,
        epoch_end_ms,
    });

    transfer::share_object(oath);
}

// === Lifecycle entry points ===

/// Permissionless mid-epoch breach trigger. Reverts unless current equity violates floor.
public entry fun mark_breach<T>(
    oath: &mut Oath<T>,
    _clock: &Clock,
) {
    assert!(oath.status == STATUS_ACTIVE, ENotActive);
    // floor = starting * (10000 - max_drawdown_bps) / 10000
    let floor = (((oath.starting_equity_usdc as u128)
        * ((10000 - oath.dims.max_drawdown_bps) as u128)
        / 10000) as u64);
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

/// Permissionless end-of-epoch settlement. Evaluates remaining dimensions, flips status,
/// distributes bond residual to LP per economics.
///
/// === Asymmetric payoff is intentional — do not "fix" ===
///
/// Max Oathkeeper upside per oath ≈ 7.5% of bond (premium ≈ 0.6 × 0.125 × Σclaims).
/// Max Oathkeeper downside per oath = entire bond. ~14:1 downside/upside.
/// This looks like option-writing economics because it IS option-writing economics.
///
/// The Oathkeeper isn't optimizing per-oath EV. They're paying a (small, probabilistic)
/// premium-loss-rate to convert private edge into a publicly-legible, copyable-by-
/// allocator track record. **Standing is the product the bond buys.** Premium income is
/// a rebate, not the goal. See `submission/PITCH-COPY.md` "verifiable opacity" framing.
///
/// Symmetric payoffs would dilute the Standing signal until it carried no information.
/// The asymmetry is what makes the signal valuable. If you find yourself "fixing" this
/// by giving the Oathkeeper back the residual on Broken, you're destroying the product.
///
/// === Conservation invariant (must hold for every settlement path) ===
///
/// Let `B = bond_amount` and `C = Σ doubter claim_amounts` and `S = Σ doubter stakes`.
/// By the stake_against invariant: C ≤ B at all times. By the stake ratio:
/// S = C × DEFAULT_STAKE_BPS / 10000 (12.5% in v1).
///
/// **Kept path:**
///   inflows  = B (bond) + S (held inside DoubterPositions)
///   outflows in this function   = B (to promiser)
///   outflows in claim_payout    = S split 60/40 → promiser + LPPool
///                               = S_promiser + S_lp = S
///   total outflows = B + S ✓
///
/// **Broken path:**
///   inflows  = B + S
///   outflows in this function   = (B - C) → LPPool residual
///   outflows in claim_payout    = C (to doubters from bond) + S (returned to doubters)
///   total outflows = (B - C) + C + S = B + S ✓
///
/// Protocol skims zero. If this math breaks, the bug is in the math — do not paper over.
public entry fun settle_epoch<T>(
    oath: &mut Oath<T>,
    registry: &mut Registry,
    lp_pool: &mut LPPool<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oath.status != STATUS_SETTLED, EAlreadySettled);
    assert!(clock::timestamp_ms(clock) >= oath.epoch_end_ms, EEpochNotEnded);

    // Determine final outcome.
    // If mark_breach already flipped status to BROKEN, honor that breach_reason.
    // Else evaluate end-of-epoch dimensions in order: min_trades, min_volume, min_pnl.
    if (oath.status == STATUS_ACTIVE) {
        if (oath.trade_count < oath.dims.min_trades) {
            oath.breach_reason = option::some(BREACH_MIN_TRADES);
            oath.status = STATUS_BROKEN;
        } else if (oath.cumulative_volume_usdc < oath.dims.min_volume_usdc) {
            oath.breach_reason = option::some(BREACH_MIN_VOLUME);
            oath.status = STATUS_BROKEN;
        } else {
            // PnL floor: current_equity >= starting * (10000 + min_pnl_bps) / 10000
            let pnl_floor = (((oath.starting_equity_usdc as u128)
                * ((10000 + oath.dims.min_pnl_bps) as u128)
                / 10000) as u64);
            if (oath.current_equity_usdc < pnl_floor) {
                oath.breach_reason = option::some(BREACH_MIN_PNL);
                oath.status = STATUS_BROKEN;
            } else {
                oath.status = STATUS_KEPT;
            }
        }
    };

    let bond_value = balance::value(&oath.bond);
    let mut bond_to_promiser = 0u64;
    let mut residual_to_lp = 0u64;

    if (oath.status == STATUS_KEPT) {
        // Drain the entire bond to the promiser. Doubter stakes are handled per-position
        // in claim_payout (60/40 split).
        let bond_bal = balance::withdraw_all(&mut oath.bond);
        bond_to_promiser = balance::value(&bond_bal);
        transfer::public_transfer(
            coin::from_balance(bond_bal, ctx),
            oath.promiser,
        );
    } else {
        // STATUS_BROKEN. Bond holds enough for all open doubter claims (invariant). Any
        // residual above open_claims is protocol-locked-otherwise and goes to LPPool.
        // Doubters extract their claim_amount (and get their stake back) via claim_payout.
        if (bond_value > oath.open_claims_usdc) {
            let residual_amount = bond_value - oath.open_claims_usdc;
            let residual_bal = balance::split(&mut oath.bond, residual_amount);
            residual_to_lp = residual_amount;
            economics::deposit_premium(lp_pool, residual_bal);
        };
    };

    // Release the registry locks so the promiser can mint a new oath and the exec
    // wallet is free to bind elsewhere.
    registry::release_scope(registry, oath.promiser, oath.scope_hash);
    registry::unbind_exec(registry, oath.scope.exec_addr);

    let final_status = oath.status;
    oath.status = STATUS_SETTLED;

    event::emit(OathSettled {
        oath_id: object::id(oath),
        final_status,
        breach_reason: oath.breach_reason,
        bond_to_promiser,
        residual_to_lp,
    });
}

// === Accessors (read-only, for adapters / other modules / tests) ===

public fun id<T>(o: &Oath<T>): &UID { &o.id }
public fun promiser<T>(o: &Oath<T>): address { o.promiser }
public fun oath_type<T>(o: &Oath<T>): OathType { o.oath_type }
public fun status<T>(o: &Oath<T>): u8 { o.status }
public fun dims<T>(o: &Oath<T>): &OathDimensions { &o.dims }
public fun scope<T>(o: &Oath<T>): &StrategyScope { &o.scope }
public fun current_equity<T>(o: &Oath<T>): u64 { o.current_equity_usdc }
public fun starting_equity<T>(o: &Oath<T>): u64 { o.starting_equity_usdc }
public fun trade_count<T>(o: &Oath<T>): u64 { o.trade_count }
public fun cumulative_volume<T>(o: &Oath<T>): u64 { o.cumulative_volume_usdc }
public fun bond_value<T>(o: &Oath<T>): u64 { balance::value(&o.bond) }
public fun open_claims<T>(o: &Oath<T>): u64 { o.open_claims_usdc }
public fun epoch_end_ms<T>(o: &Oath<T>): u64 { o.epoch_end_ms }
public fun epoch_start_ms<T>(o: &Oath<T>): u64 { o.epoch_start_ms }
public fun exec_addr<T>(o: &Oath<T>): address { o.scope.exec_addr }
public fun breach_reason<T>(o: &Oath<T>): Option<u8> { o.breach_reason }
public fun scope_hash<T>(o: &Oath<T>): vector<u8> { o.scope_hash }

// Dimension field accessors (read-only).
public fun max_drawdown_bps(d: &OathDimensions): u64 { d.max_drawdown_bps }
public fun min_trades(d: &OathDimensions): u64 { d.min_trades }
public fun min_pnl_bps(d: &OathDimensions): u64 { d.min_pnl_bps }
public fun min_volume_usdc(d: &OathDimensions): u64 { d.min_volume_usdc }

// Strategy scope field accessors.
public fun scope_exec_addr(s: &StrategyScope): address { s.exec_addr }
public fun scope_venue(s: &StrategyScope): u8 { s.venue }
public fun scope_allowed_assets(s: &StrategyScope): &vector<vector<u8>> { &s.allowed_assets }
public fun scope_epoch_duration_ms(s: &StrategyScope): u64 { s.epoch_duration_ms }

// Status constants exposed for cross-module checks (doubter, attestation).
public fun status_active(): u8 { STATUS_ACTIVE }
public fun status_kept(): u8 { STATUS_KEPT }
public fun status_broken(): u8 { STATUS_BROKEN }
public fun status_settled(): u8 { STATUS_SETTLED }

// Constructors for OathDimensions / StrategyScope (since fields are non-public).
public fun new_dimensions(
    max_drawdown_bps: u64,
    min_trades: u64,
    min_pnl_bps: u64,
    min_volume_usdc: u64,
): OathDimensions {
    OathDimensions { max_drawdown_bps, min_trades, min_pnl_bps, min_volume_usdc }
}

public fun new_scope(
    exec_addr: address,
    venue: u8,
    allowed_assets: vector<vector<u8>>,
    epoch_duration_ms: u64,
): StrategyScope {
    StrategyScope { exec_addr, venue, allowed_assets, epoch_duration_ms }
}

// === Package-internal mutators (used by attestation, doubter) ===

public(package) fun record_equity_update<T>(
    oath: &mut Oath<T>,
    new_equity: u64,
    notional: u64,
) {
    oath.current_equity_usdc = new_equity;
    oath.cumulative_volume_usdc = oath.cumulative_volume_usdc + notional;
    oath.trade_count = oath.trade_count + 1;
}

public(package) fun add_open_claim<T>(oath: &mut Oath<T>, amount: u64) {
    oath.open_claims_usdc = oath.open_claims_usdc + amount;
}

public(package) fun reduce_open_claim<T>(oath: &mut Oath<T>, amount: u64) {
    oath.open_claims_usdc = oath.open_claims_usdc - amount;
}

/// Withdraw `amount` from the bond; aborts if amount exceeds remaining bond.
public(package) fun consume_bond<T>(oath: &mut Oath<T>, amount: u64): Balance<T> {
    balance::split(&mut oath.bond, amount)
}

/// Alias for the partial-split path (callers may prefer the more explicit name).
public(package) fun split_bond<T>(oath: &mut Oath<T>, amount: u64): Balance<T> {
    balance::split(&mut oath.bond, amount)
}

public(package) fun set_status<T>(oath: &mut Oath<T>, status: u8, reason: Option<u8>) {
    oath.status = status;
    oath.breach_reason = reason;
}

// === OathType constructors (avoid leaking enum literal across modules) ===

public fun trading_oath(): OathType { OathType::TradingOath }
public fun uptime_oath(): OathType { OathType::UptimeOath }
public fun behavior_oath(): OathType { OathType::BehaviorOath }
public fun validator_oath(): OathType { OathType::ValidatorOath }
public fun treasury_oath(): OathType { OathType::TreasuryOath }

// === Internal helpers ===

fun oath_type_tag(t: OathType): u8 {
    match (t) {
        OathType::TradingOath => 0,
        OathType::UptimeOath => 1,
        OathType::BehaviorOath => 2,
        OathType::ValidatorOath => 3,
        OathType::TreasuryOath => 4,
    }
}
