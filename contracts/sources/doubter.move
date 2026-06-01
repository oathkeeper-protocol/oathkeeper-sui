/// Doubter Position — stakes AGAINST an Oathkeeper's active oath.
///
/// Doubters are open-market participants who back the Client. On Broken, they get
/// their stake back + pro-rata share of 70% of Believer stakes. On Kept, they lose
/// their entire stake (split 10/20/70 to Platform/Oathkeeper/Believers).
///
/// v2: Doubters stake freely (no claim_amount, no bond-coverage invariant).
/// The Client has the SLA claim against the bond; Doubters participate in the
/// open-market pricing layer.
module oathkeeper::doubter;

use sui::balance;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use oathkeeper::oath::{Self, Oath};

// === Errors ===
const EOathNotActive: u64 = 0;
const EEpochEnded: u64 = 1;
const EZeroStake: u64 = 2;
const EWrongOath: u64 = 3;
const EAlreadyClaimed: u64 = 4;
const ENotSettled: u64 = 5;

// === Position object (owned) ===

public struct DoubterPosition<phantom T> has key, store {
    id: UID,
    oath_id: ID,
    doubter: address,
    stake_amount: u64,
    claimed: bool,
}

// === Events ===

public struct DoubterStaked has copy, drop {
    oath_id: ID,
    position_id: ID,
    doubter: address,
    stake_amount: u64,
}

public struct DoubterPayout has copy, drop {
    oath_id: ID,
    position_id: ID,
    doubter: address,
    amount: u64,
}

// === Entry: stake against an active oath ===

public entry fun stake_against<T>(
    oath: &mut Oath<T>,
    stake: Coin<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oath::status(oath) == oath::status_active(), EOathNotActive);
    assert!(clock::timestamp_ms(clock) < oath::epoch_end_ms(oath), EEpochEnded);
    let amount = coin::value(&stake);
    assert!(amount > 0, EZeroStake);

    oath::add_doubter_stake(oath, coin::into_balance(stake));

    let doubter = tx_context::sender(ctx);
    let oath_id = object::uid_to_inner(oath::id(oath));
    let position = DoubterPosition<T> {
        id: object::new(ctx),
        oath_id,
        doubter,
        stake_amount: amount,
        claimed: false,
    };
    let position_id = object::id(&position);
    event::emit(DoubterStaked { oath_id, position_id, doubter, stake_amount: amount });
    transfer::public_transfer(position, doubter);
}

// === Entry: claim payout after settlement ===

/// Winners (Doubters on Broken) claim pro-rata from winner_payout_pool.
/// Losers (Doubters on Kept) get nothing.
public entry fun claim_payout<T>(
    position: &mut DoubterPosition<T>,
    oath: &mut Oath<T>,
    ctx: &mut TxContext,
) {
    assert!(!position.claimed, EAlreadyClaimed);
    assert!(position.oath_id == object::uid_to_inner(oath::id(oath)), EWrongOath);
    assert!(oath::status(oath) == oath::status_settled(), ENotSettled);

    let is_winner = oath::breach_reason(oath).is_some(); // Broken = breach = Doubters win
    position.claimed = true;

    if (is_winner) {
        let payout_bal = oath::claim_winner_share(oath, position.stake_amount);
        let amount = balance::value(&payout_bal);
        transfer::public_transfer(coin::from_balance(payout_bal, ctx), position.doubter);
        event::emit(DoubterPayout {
            oath_id: position.oath_id,
            position_id: object::id(position),
            doubter: position.doubter,
            amount,
        });
    } else {
        event::emit(DoubterPayout {
            oath_id: position.oath_id,
            position_id: object::id(position),
            doubter: position.doubter,
            amount: 0,
        });
    };
}

// === Accessors ===

public fun oath_id<T>(p: &DoubterPosition<T>): ID { p.oath_id }
public fun doubter<T>(p: &DoubterPosition<T>): address { p.doubter }
public fun stake_amount<T>(p: &DoubterPosition<T>): u64 { p.stake_amount }
public fun is_claimed<T>(p: &DoubterPosition<T>): bool { p.claimed }
