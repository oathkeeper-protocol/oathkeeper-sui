/// LP pool + settlement payout math.
///
/// Payout rules (from README):
///   - Kept:    bond → Oathkeeper. Doubter stakes split 60% Oathkeeper / 40% LPPool
///              (handled in `doubter::claim_payout`, not here).
///   - Broken:  bond pays open doubter claims (in `doubter::claim_payout`); residual
///              from `oath::settle_epoch` deposits into LPPool via `deposit_premium`.
///              Doubter stakes returned to Doubters along with their claim payout.
///   - Conservation: Σ inflows = Σ outflows across every settlement. Protocol skims zero.
module oathkeeper::economics;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;

// === Errors ===
const EZeroDeposit: u64 = 0;
const EInsufficientLPShares: u64 = 1;
const EPoolEmpty: u64 = 2;

// === Split constants (basis points) — used by `doubter::claim_payout` ===
const KEPT_PROMISER_BPS: u64 = 6000;
const KEPT_LP_BPS: u64 = 4000;

// === LPPool shared object ===

public struct LPPool<phantom T> has key {
    id: UID,
    reserves: Balance<T>,
    total_shares: u64,
}

/// LP share receipt (owned). Burn to redeem proportional reserves.
public struct LPShare<phantom T> has key, store {
    id: UID,
    pool_id: ID,
    shares: u64,
}

// === Events ===

public struct PoolCreated has copy, drop {
    pool_id: ID,
}

public struct LPDeposit has copy, drop {
    pool_id: ID,
    provider: address,
    amount: u64,
    shares_minted: u64,
}

public struct LPRedeem has copy, drop {
    pool_id: ID,
    provider: address,
    shares_burned: u64,
    amount: u64,
}

public struct PremiumDeposited has copy, drop {
    pool_id: ID,
    amount: u64,
}

// === Init ===

/// Module init is non-generic; per-coin pools are created on demand via `create_pool<T>`.
fun init(_ctx: &mut TxContext) {}

/// Create and share a new LPPool for coin type `T`. Idempotency is the caller's
/// responsibility (off-chain coordination — one pool per T per deployment).
public entry fun create_pool<T>(ctx: &mut TxContext) {
    let pool = LPPool<T> {
        id: object::new(ctx),
        reserves: balance::zero<T>(),
        total_shares: 0,
    };
    event::emit(PoolCreated { pool_id: object::id(&pool) });
    transfer::share_object(pool);
}

// === LP entry points ===

public entry fun deposit_lp<T>(
    pool: &mut LPPool<T>,
    deposit: Coin<T>,
    ctx: &mut TxContext,
) {
    let amount = coin::value(&deposit);
    assert!(amount > 0, EZeroDeposit);

    let reserves_value = balance::value(&pool.reserves);
    let shares = if (pool.total_shares == 0) {
        // First deposit: 1 unit of asset == 1 share.
        amount
    } else {
        // Subsequent: shares = amount * total_shares / reserves_value.
        // Use u128 to avoid overflow; reserves_value > 0 here because total_shares > 0
        // implies at least one prior deposit that put reserves above zero (premiums on
        // top of that only increase reserves).
        assert!(reserves_value > 0, EPoolEmpty);
        (((amount as u128) * (pool.total_shares as u128) / (reserves_value as u128)) as u64)
    };

    balance::join(&mut pool.reserves, coin::into_balance(deposit));
    pool.total_shares = pool.total_shares + shares;

    let pool_id = object::id(pool);
    let share = LPShare<T> {
        id: object::new(ctx),
        pool_id,
        shares,
    };
    let provider = tx_context::sender(ctx);
    event::emit(LPDeposit { pool_id, provider, amount, shares_minted: shares });
    transfer::public_transfer(share, provider);
}

public entry fun redeem_lp<T>(
    pool: &mut LPPool<T>,
    share: LPShare<T>,
    ctx: &mut TxContext,
) {
    let LPShare { id, pool_id, shares } = share;
    object::delete(id);
    assert!(shares > 0, EInsufficientLPShares);
    assert!(pool.total_shares >= shares, EInsufficientLPShares);

    let reserves_value = balance::value(&pool.reserves);
    let amount = (((shares as u128) * (reserves_value as u128) / (pool.total_shares as u128)) as u64);

    pool.total_shares = pool.total_shares - shares;
    let payout_bal = balance::split(&mut pool.reserves, amount);
    let payout = coin::from_balance(payout_bal, ctx);

    let provider = tx_context::sender(ctx);
    event::emit(LPRedeem { pool_id, provider, shares_burned: shares, amount });
    transfer::public_transfer(payout, provider);
}

// === Package-internal: called by `oath::settle_epoch` and `doubter::claim_payout` ===

/// Deposit a premium (Broken residual, or Kept stake-LP-portion) into the pool.
/// No shares minted — existing LPs gain proportional value via reserves dilution.
public(package) fun deposit_premium<T>(
    pool: &mut LPPool<T>,
    premium: Balance<T>,
) {
    let amount = balance::value(&premium);
    balance::join(&mut pool.reserves, premium);
    event::emit(PremiumDeposited { pool_id: object::id(pool), amount });
}

// === Split-ratio accessors (used by doubter::claim_payout) ===

public fun kept_promiser_bps(): u64 { KEPT_PROMISER_BPS }
public fun kept_lp_bps(): u64 { KEPT_LP_BPS }

// === Accessors ===

public fun reserves_value<T>(p: &LPPool<T>): u64 { balance::value(&p.reserves) }
public fun total_shares<T>(p: &LPPool<T>): u64 { p.total_shares }
public fun share_value<T>(s: &LPShare<T>): u64 { s.shares }
public fun share_pool_id<T>(s: &LPShare<T>): ID { s.pool_id }
