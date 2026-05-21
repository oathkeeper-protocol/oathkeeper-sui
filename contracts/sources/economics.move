/// LP pool + settlement payout math.
///
/// Week 1 Day 5 lands the bodies. This file ships the LPPool type and entry skeletons
/// so `oath::settle_epoch` has a stable signature against `&mut LPPool<T>` from Day 2.
///
/// Payout rules (from README):
///   - Kept:    bond → Oathkeeper. Doubter stakes split 60% Oathkeeper / 40% LPPool.
///   - Broken:  bond pays open doubter claims first (claim order), residual → LPPool.
///              Oathkeeper receives zero. Doubter stakes follow same Kept split? No —
///              on Broken, Doubter stakes are returned to Doubters along with claim payout.
///              (Lock semantics Day 5.)
///   - Conservation: Σ inflows = Σ outflows across every settlement. Protocol skims zero.
module oathkeeper::economics;

use sui::balance::Balance;
use sui::coin::Coin;

// === Errors ===
const EZeroDeposit: u64 = 0;
const EInsufficientLPShares: u64 = 1;
const ENotSettler: u64 = 2;

// === Split constants (basis points) ===
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

public struct SettlementPayout has copy, drop {
    oath_id: ID,
    promiser_amount: u64,
    lp_amount: u64,
    doubters_amount: u64,
    outcome: u8,
}

// === Init ===

fun init(ctx: &mut TxContext) { abort 0 }

// === LP entry points ===

public entry fun deposit_lp<T>(
    pool: &mut LPPool<T>,
    deposit: Coin<T>,
    ctx: &mut TxContext,
) { abort 0 }

public entry fun redeem_lp<T>(
    pool: &mut LPPool<T>,
    share: LPShare<T>,
    ctx: &mut TxContext,
) { abort 0 }

// === Package-internal: called by oath::settle_epoch ===

public(package) fun deposit_premium<T>(
    pool: &mut LPPool<T>,
    premium: Balance<T>,
) { abort 0 }

// === Accessors ===

public fun reserves_value<T>(p: &LPPool<T>): u64 { abort 0 }
public fun total_shares<T>(p: &LPPool<T>): u64 { abort 0 }
public fun share_value<T>(s: &LPShare<T>): u64 { abort 0 }
