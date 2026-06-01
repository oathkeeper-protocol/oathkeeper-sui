/// Believer Position — stakes FOR an Oathkeeper's active oath.
///
/// Believers are open-market participants who back the operator. On Kept, they get
/// their stake back + pro-rata share of 70% of Doubter stakes. On Broken, they lose
/// their entire stake (split 10/20/70 to Platform/Client/Doubters).
///
/// Stakes pool into Oath.believer_pool at stake time; the BelieverPosition holds
/// the amount only (no Balance). This enables pro-rata settlement math without
/// iterating over all positions.
module oathkeeper::believer;

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
const ENotWinner: u64 = 6;

// === Position object (owned) ===

public struct BelieverPosition<phantom T> has key, store {
    id: UID,
    oath_id: ID,
    believer: address,
    stake_amount: u64,
    claimed: bool,
}

// === Events ===

public struct BelieverStaked has copy, drop {
    oath_id: ID,
    position_id: ID,
    believer: address,
    stake_amount: u64,
}

public struct BelieverPayout has copy, drop {
    oath_id: ID,
    position_id: ID,
    believer: address,
    amount: u64,
}

// === Entry: stake in support of an active oath ===

public entry fun stake_for<T>(
    oath: &mut Oath<T>,
    stake: Coin<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oath::status(oath) == oath::status_active(), EOathNotActive);
    assert!(clock::timestamp_ms(clock) < oath::epoch_end_ms(oath), EEpochEnded);
    let amount = coin::value(&stake);
    assert!(amount > 0, EZeroStake);

    oath::add_believer_stake(oath, coin::into_balance(stake));

    let believer = tx_context::sender(ctx);
    let oath_id = object::uid_to_inner(oath::id(oath));
    let position = BelieverPosition<T> {
        id: object::new(ctx),
        oath_id,
        believer,
        stake_amount: amount,
        claimed: false,
    };
    let position_id = object::id(&position);
    event::emit(BelieverStaked { oath_id, position_id, believer, stake_amount: amount });
    transfer::public_transfer(position, believer);
}

// === Entry: claim payout after settlement ===

/// Winners (Believers on Kept) claim pro-rata from winner_payout_pool.
/// Losers (Believers on Broken) get nothing — their stake was already distributed
/// during settle_epoch.
public entry fun claim_payout<T>(
    position: &mut BelieverPosition<T>,
    oath: &mut Oath<T>,
    ctx: &mut TxContext,
) {
    assert!(!position.claimed, EAlreadyClaimed);
    assert!(position.oath_id == object::uid_to_inner(oath::id(oath)), EWrongOath);
    assert!(oath::status(oath) == oath::status_settled(), ENotSettled);

    let is_winner = oath::breach_reason(oath).is_none(); // Kept = no breach = Believers win
    position.claimed = true;

    if (is_winner) {
        let payout_bal = oath::claim_winner_share(oath, position.stake_amount);
        let amount = balance::value(&payout_bal);
        transfer::public_transfer(coin::from_balance(payout_bal, ctx), position.believer);
        event::emit(BelieverPayout {
            oath_id: position.oath_id,
            position_id: object::id(position),
            believer: position.believer,
            amount,
        });
    } else {
        event::emit(BelieverPayout {
            oath_id: position.oath_id,
            position_id: object::id(position),
            believer: position.believer,
            amount: 0,
        });
    };
}

// === Accessors ===

public fun oath_id<T>(p: &BelieverPosition<T>): ID { p.oath_id }
public fun believer<T>(p: &BelieverPosition<T>): address { p.believer }
public fun stake_amount<T>(p: &BelieverPosition<T>): u64 { p.stake_amount }
public fun is_claimed<T>(p: &BelieverPosition<T>): bool { p.claimed }
