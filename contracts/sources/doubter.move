/// Doubter Position — an owned object representing a stake against an active Oath.
///
/// Owned (not shared) because each Position is held by one wallet; transferability to a
/// secondary market is a v2 opportunity. The stake/claim relationship: stake is a fixed
/// fraction (12.5% default) of claim amount. Claim is what the Doubter wins from the bond
/// on breach; stake is what they lose to the Oathkeeper + LP on a kept oath.
module oathkeeper::doubter;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use oathkeeper::oath::{Self, Oath};
use oathkeeper::economics::{Self, LPPool};

// === Errors ===
const EOathNotActive: u64 = 0;
const EClaimExceedsAvailableBond: u64 = 1;
const EZeroClaim: u64 = 2;
const EWrongOath: u64 = 3;
const EAlreadyClaimed: u64 = 4;
const ENotSettled: u64 = 5;
const EStakeAmountMismatch: u64 = 6;
const EEpochEnded: u64 = 7;

// === Stake-to-claim ratio (basis points). Default 1250 = 12.5%. ===
const DEFAULT_STAKE_BPS: u64 = 1250;

// === Outcome tags used in `DoubterPayout` event. ===
const OUTCOME_KEPT: u8 = 1;
const OUTCOME_BROKEN: u8 = 2;

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
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // Gates.
    assert!(oath::status(oath) == oath::status_active(), EOathNotActive);
    assert!(clock::timestamp_ms(clock) < oath::epoch_end_ms(oath), EEpochEnded);
    assert!(claim_amount > 0, EZeroClaim);

    // Stake-to-claim ratio: stake must equal claim_amount * 1250 / 10000.
    let required_stake = (((claim_amount as u128) * (DEFAULT_STAKE_BPS as u128) / 10000) as u64);
    assert!(coin::value(&stake) == required_stake, EStakeAmountMismatch);

    // Bond-coverage invariant: Σ claim_amounts ≤ bond_value.
    assert!(
        oath::open_claims(oath) + claim_amount <= oath::bond_value(oath),
        EClaimExceedsAvailableBond,
    );

    oath::add_open_claim(oath, claim_amount);

    let doubter = tx_context::sender(ctx);
    let oath_id = object::uid_to_inner(oath::id(oath));
    let stake_amount = coin::value(&stake);
    let position = DoubterPosition<T> {
        id: object::new(ctx),
        oath_id,
        doubter,
        claim_amount,
        stake: coin::into_balance(stake),
        claimed: false,
    };
    let position_id = object::id(&position);

    event::emit(StakePlaced {
        oath_id,
        position_id,
        doubter,
        claim_amount,
        stake_amount,
    });

    transfer::public_transfer(position, doubter);
}

// === Entry: claim payout after settlement ===

/// Called by the Doubter post-settlement.
///
/// Broken outcome: extract `claim_amount` from oath bond (Doubter's winnings) + return
/// `stake` to Doubter. Reduces `oath.open_claims_usdc`.
///
/// Kept outcome: consume `stake` and split 60% → promiser, 40% → LPPool. Doubter gets
/// nothing (the cost of being wrong).
public entry fun claim_payout<T>(
    position: &mut DoubterPosition<T>,
    oath: &mut Oath<T>,
    lp_pool: &mut LPPool<T>,
    ctx: &mut TxContext,
) {
    // Gates.
    assert!(!position.claimed, EAlreadyClaimed);
    assert!(
        position.oath_id == object::uid_to_inner(oath::id(oath)),
        EWrongOath,
    );
    assert!(oath::status(oath) == oath::status_settled(), ENotSettled);

    let outcome_broken = oath::breach_reason(oath).is_some();
    let doubter = position.doubter;
    let position_id = object::id(position);
    let oath_id = position.oath_id;

    if (outcome_broken) {
        // Pull claim_amount from bond; return stake to doubter; both go to the doubter.
        let claim_amt = position.claim_amount;
        let claim_bal = oath::split_bond(oath, claim_amt);
        let stake_bal = balance::withdraw_all(&mut position.stake);
        let stake_amt = balance::value(&stake_bal);

        // Combine claim + returned stake into one Coin transfer.
        let mut payout_bal = claim_bal;
        balance::join(&mut payout_bal, stake_bal);

        oath::reduce_open_claim(oath, claim_amt);

        let total = claim_amt + stake_amt;
        let payout = coin::from_balance(payout_bal, ctx);
        transfer::public_transfer(payout, doubter);

        event::emit(DoubterPayout {
            oath_id,
            position_id,
            doubter,
            amount: total,
            outcome: OUTCOME_BROKEN,
        });
    } else {
        // Kept: split stake 60/40 between promiser and LPPool. No payout to doubter.
        let stake_bal = balance::withdraw_all(&mut position.stake);
        let stake_amt = balance::value(&stake_bal);

        let promiser_amt = (((stake_amt as u128)
            * (economics::kept_promiser_bps() as u128)
            / 10000) as u64);

        let mut stake_remaining = stake_bal;
        let promiser_bal = balance::split(&mut stake_remaining, promiser_amt);
        transfer::public_transfer(
            coin::from_balance(promiser_bal, ctx),
            oath::promiser(oath),
        );
        // Whatever's left after the 60% cut goes to LP — uses subtraction not a separate
        // mul to keep conservation exact on rounding.
        economics::deposit_premium(lp_pool, stake_remaining);

        event::emit(DoubterPayout {
            oath_id,
            position_id,
            doubter,
            amount: 0,
            outcome: OUTCOME_KEPT,
        });
    };

    position.claimed = true;
}

// === Accessors ===

public fun oath_id<T>(p: &DoubterPosition<T>): ID { p.oath_id }
public fun doubter<T>(p: &DoubterPosition<T>): address { p.doubter }
public fun claim_amount<T>(p: &DoubterPosition<T>): u64 { p.claim_amount }
public fun stake_amount<T>(p: &DoubterPosition<T>): u64 { balance::value(&p.stake) }
public fun is_claimed<T>(p: &DoubterPosition<T>): bool { p.claimed }
public fun default_stake_bps(): u64 { DEFAULT_STAKE_BPS }
