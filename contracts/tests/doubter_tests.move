#[test_only]
module oathkeeper::doubter_tests;

use sui::clock::{Self, Clock};
use sui::coin;
use sui::test_scenario::{Self, Scenario};
use oathkeeper::oath::{Self, Oath};
use oathkeeper::registry::{Self, Registry};
use oathkeeper::economics::{Self, LPPool};
use oathkeeper::doubter::{Self, DoubterPosition};
use oathkeeper::test_utils::{Self, USDC};

// === Helper: shared mint setup ===

fun mint_default_oath(): Scenario {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry,
        oath::trading_oath(),
        test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond,
        b"blob",
        42,
        100_000,
        &clock,
        test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"sig", b"pk", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    scenario
}

// === stake_against ===

#[test]
fun stake_against_happy_path() {
    let mut scenario = mint_default_oath();
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    // claim = 1000, required stake = 1000 * 0.125 = 125
    let stake = test_utils::mint_usdc(125, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 1000, stake, &clock, test_scenario::ctx(&mut scenario));

    assert!(oath::open_claims(&oath) == 1000);
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Doubter should hold a DoubterPosition.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let pos = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    assert!(doubter::claim_amount(&pos) == 1000);
    assert!(doubter::stake_amount(&pos) == 125);
    assert!(!doubter::is_claimed(&pos));
    test_scenario::return_to_sender(&scenario, pos);

    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EStakeAmountMismatch)]
fun stake_against_aborts_on_wrong_stake_ratio() {
    let mut scenario = mint_default_oath();
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bad_stake = test_utils::mint_usdc(100, test_scenario::ctx(&mut scenario)); // should be 125
    doubter::stake_against<USDC>(&mut oath, 1000, bad_stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EZeroClaim)]
fun stake_against_aborts_on_zero_claim() {
    let mut scenario = mint_default_oath();
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let stake = test_utils::mint_usdc(0, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 0, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EClaimExceedsAvailableBond)]
fun stake_against_aborts_on_bond_coverage_breach() {
    let mut scenario = mint_default_oath();
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    // bond = 10_000; claim 20_000 exceeds.
    let stake = test_utils::mint_usdc(2500, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 20_000, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EEpochEnded)]
fun stake_against_aborts_after_epoch_end() {
    let mut scenario = mint_default_oath();
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000); // past epoch_end_ms (=1_000_000)
    let stake = test_utils::mint_usdc(125, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 1000, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

// === claim_payout: BROKEN ===

#[test]
fun claim_payout_broken_pays_claim_plus_stake_refund() {
    let mut scenario = mint_default_oath();

    // Doubter stakes 125 for 1000 claim.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let stake = test_utils::mint_usdc(125, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 1000, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Settle Broken (no trades → min_trades breach).
    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );

    // Pool got residual = 10_000 - 1_000 = 9_000
    assert!(economics::reserves_value(&pool) == 9_000);
    assert!(oath::bond_value(&oath) == 1_000); // reserved for the doubter's claim

    // Doubter claims.
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    clock::destroy_for_testing(clock);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos, &mut oath, &mut pool, test_scenario::ctx(&mut scenario));
    assert!(doubter::is_claimed(&pos));
    assert!(oath::open_claims(&oath) == 0);
    assert!(oath::bond_value(&oath) == 0); // claim drained the remainder
    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);

    // Doubter received claim (1000) + stake refund (125) = 1125.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let payout = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&payout) == 1125);
    test_utils::burn_usdc(payout);

    test_scenario::end(scenario);
}

// === claim_payout: KEPT ===

#[test]
fun claim_payout_kept_splits_stake_60_40() {
    let mut scenario = mint_default_oath();

    // Doubter stakes 125 for 1000 claim.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let stake = test_utils::mint_usdc(125, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 1000, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Drive 10 trades + PnL above 5% floor.
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut i = 0;
    while (i < 10) {
        oath::record_equity_update<USDC>(&mut oath, 110_000, 1000);
        i = i + 1;
    };
    test_scenario::return_shared(oath);

    // Settle Kept.
    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);

    // Doubter calls claim_payout — stake split 60/40.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos, &mut oath, &mut pool, test_scenario::ctx(&mut scenario));
    assert!(doubter::is_claimed(&pos));
    assert!(doubter::stake_amount(&pos) == 0);

    // LP pool received 40% of stake = 50.
    assert!(economics::reserves_value(&pool) == 50);

    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);

    // Promiser received 60% of stake = 75 (separate Coin from the bond payout of 10_000).
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let p1 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    let p2 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    let v1 = coin::value(&p1);
    let v2 = coin::value(&p2);
    assert!(v1 + v2 == 10_075); // 10_000 bond + 75 stake share
    test_utils::burn_usdc(p1);
    test_utils::burn_usdc(p2);

    // Doubter receives nothing on Kept.
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EAlreadyClaimed)]
fun claim_payout_aborts_on_double_claim() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let stake = test_utils::mint_usdc(125, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, 1000, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos, &mut oath, &mut pool, test_scenario::ctx(&mut scenario));
    // Double claim aborts.
    doubter::claim_payout<USDC>(&mut pos, &mut oath, &mut pool, test_scenario::ctx(&mut scenario));
    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::end(scenario);
}

#[test]
fun default_stake_bps_is_1250() {
    assert!(doubter::default_stake_bps() == 1250);
}
