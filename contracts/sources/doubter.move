/// Doubter Position — an owned object representing a stake against an active Oath.
///
/// Owned (not shared) because each Position is held by one wallet; transferability to a
/// secondary market is a v2 opportunity. The stake/claim relationship: stake is a fixed
/// fraction (12.5% default) of claim amount. Claim is what the Doubter wins from the bond
/// on breach; stake is what they lose to the Oathkeeper + LP on a kept oath.
module oathkeeper::doubter;

use sui::balance::Balance;
use sui::coin::Coin;
use oathkeeper::oath::Oath;

// === Errors ===
const EOathNotActive: u64 = 0;
const EClaimExceedsAvailableBond: u64 = 1;
const EZeroClaim: u64 = 2;
const EWrongOath: u64 = 3;
const EAlreadyClaimed: u64 = 4;
const ENotBreached: u64 = 5;
const ENotKept: u64 = 6;

// === Stake-to-claim ratio (basis points). Default 1250 = 12.5%. ===
const DEFAULT_STAKE_BPS: u64 = 1250;

// === Position object (owned) ===

public struct DoubterPosition<phantom T> has key, store {
    id: UID,
    oath_id: ID,
    doubter: address,
    claim_amount: u64,
    stake: Balance<T>,
    /// True after settlement payout has been swept into a `Coin` for the owner.
    claimed: bool,
}

// === Events ===

public struct StakePlaced has copy, drop {
    oath_id: ID,
    position_id: ID,
    doubter: address,
    claim_amount: u64,
    stake_amount: u64,
}

public struct DoubterPayout has copy, drop {
    oath_id: ID,
    position_id: ID,
    doubter: address,
    amount: u64,
    outcome: u8,
}

// === Entry: stake against an active oath ===

public entry fun stake_against<T>(
    oath: &mut Oath<T>,
    claim_amount: u64,
    stake: Coin<T>,
    ctx: &mut TxContext,
) { abort 0 }

// === Entry: claim payout after settlement ===

/// Called by the Doubter post-settlement. Pays out from oath bond if Broken, or returns
/// nothing (and consumes stake into Oathkeeper+LP per economics) if Kept.
public entry fun claim_payout<T>(
    position: &mut DoubterPosition<T>,
    oath: &mut Oath<T>,
    ctx: &mut TxContext,
) { abort 0 }

// === Accessors ===

public fun oath_id<T>(p: &DoubterPosition<T>): ID { abort 0 }
public fun doubter<T>(p: &DoubterPosition<T>): address { abort 0 }
public fun claim_amount<T>(p: &DoubterPosition<T>): u64 { abort 0 }
public fun stake_amount<T>(p: &DoubterPosition<T>): u64 { abort 0 }
public fun is_claimed<T>(p: &DoubterPosition<T>): bool { abort 0 }
