#[test_only]
module oathkeeper::v2_tests;

use sui::clock;
use sui::coin;
use sui::test_scenario::{Self, Scenario};
use oathkeeper::oath::{Self, Oath};
use oathkeeper::oath_registry::{Self, Registry};
use oathkeeper::believer::{Self, BelieverPosition};
use oathkeeper::doubter::{Self, DoubterPosition};
use oathkeeper::test_utils::{Self, USDC};

// ==================== HELPERS ====================

fun mint_oath(client_claim: u64): Scenario {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), client_claim,
        b"blob", 42, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"sig", b"pk", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    scenario
}

fun satisfy_dims(scenario: &mut Scenario) {
    test_scenario::next_tx(scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(scenario);
    let mut i = 0;
    while (i < 10) {
        oath::record_equity_update<USDC>(&mut oath, 110_000, 1000);
        i = i + 1;
    };
    test_scenario::return_shared(oath);
}

fun settle(scenario: &mut Scenario) {
    test_scenario::next_tx(scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    oath::settle_epoch<USDC>(&mut oath, &mut registry, &clock, test_scenario::ctx(scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(registry);
}

// ==================== MINT FLOW ====================

#[test]
fun mint_flow_happy_path() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_active());
    assert!(oath::bond_value(&oath) == 10_000);
    assert!(oath::client(&oath) == test_utils::client_addr());
    assert!(oath::client_claim(&oath) == 5_000);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EMinTradesTooLow)]
fun mint_aborts_min_trades_zero() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let bad_dims = oath::new_dimensions(2000, 0, 500, 0);
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), bad_dims,
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 500, b"b", 1, 100_000,
        &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(reservation, b"", b"", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EClientClaimExceedsBond)]
fun mint_aborts_claim_exceeds_bond() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 5000, b"b", 1, 100_000,
        &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(reservation, b"", b"", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EUnsupportedOathType)]
fun mint_aborts_validator_oath() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::validator_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 500, b"b", 1, 100_000,
        &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(reservation, b"", b"", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// ==================== STAKING ====================

#[test]
fun believer_and_doubter_stake_accumulates() {
    let mut scenario = mint_oath(5_000);

    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let stake = test_utils::mint_usdc(2_000, test_scenario::ctx(&mut scenario));
    believer::stake_for<USDC>(&mut oath, stake, &clock, test_scenario::ctx(&mut scenario));
    assert!(oath::total_believer_stakes(&oath) == 2_000);
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let stake = test_utils::mint_usdc(1_500, test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, stake, &clock, test_scenario::ctx(&mut scenario));
    assert!(oath::total_doubter_stakes(&oath) == 1_500);
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::believer::EEpochEnded)]
fun believer_stake_aborts_after_epoch() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    let stake = test_utils::mint_usdc(100, test_scenario::ctx(&mut scenario));
    believer::stake_for<USDC>(&mut oath, stake, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

// ==================== MARK BREACH ====================

#[test]
fun mark_breach_on_drawdown() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    oath::record_equity_update<USDC>(&mut oath, 70_000, 0);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    oath::mark_breach<USDC>(&mut oath, &clock);
    assert!(oath::status(&oath) == oath::status_broken());
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EDrawdownNotBreached)]
fun mark_breach_aborts_above_floor() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    oath::mark_breach<USDC>(&mut oath, &clock);
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

// ==================== SETTLEMENT — KEPT ====================

#[test]
fun settle_kept_no_market_participants() {
    let mut scenario = mint_oath(5_000);
    satisfy_dims(&mut scenario);
    settle(&mut scenario);

    // Promiser should have bond back.
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let payout = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&payout) == 10_000);
    test_utils::burn_usdc(payout);

    test_scenario::end(scenario);
}

#[test]
fun settle_kept_conservation_with_market() {
    // Bond=10000, Client claim=5000, Believer=2000, Doubter=1500.
    // Kept: bond→Promiser(10000), Doubter stakes split 10/20/70 (150/300/1050).
    // Believers claim: 2000 (own) + 1050 (from doubters) = 3050.
    // Total out: 10000 + 150 + 300 + 3050 = 13500 = Total in (10000+2000+1500) ✓
    let mut scenario = mint_oath(5_000);

    // Believer stakes 2000.
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    believer::stake_for<USDC>(
        &mut oath, test_utils::mint_usdc(2_000, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Doubter stakes 1500.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(
        &mut oath, test_utils::mint_usdc(1_500, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    satisfy_dims(&mut scenario);
    settle(&mut scenario);

    // Verify winner pool and claim in one block.
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::winner_payout_pool_value(&oath) == 3050);
    assert!(oath::winner_stakes_remaining(&oath) == 2000);
    let mut pos = test_scenario::take_from_sender<BelieverPosition<USDC>>(&scenario);
    believer::claim_payout<USDC>(&mut pos, &mut oath, test_scenario::ctx(&mut scenario));
    assert!(believer::is_claimed(&pos));
    assert!(oath::winner_payout_pool_value(&oath) == 0);
    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);

    // Believer received 3050.
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let payout = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&payout) == 3050);
    test_utils::burn_usdc(payout);

    // Promiser received bond (10000) + 20% of Doubter stakes (300).
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let p1 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    let p2 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&p1) + coin::value(&p2) == 10_300);
    test_utils::burn_usdc(p1);
    test_utils::burn_usdc(p2);

    // Platform (deployer) received 10% of Doubter stakes = 150.
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let plat = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&plat) == 150);
    test_utils::burn_usdc(plat);

    test_scenario::end(scenario);
}

// ==================== SETTLEMENT — BROKEN ====================

#[test]
fun settle_broken_via_min_trades_no_market() {
    let mut scenario = mint_oath(5_000);
    // No trades recorded → broken via min_trades.
    settle(&mut scenario);

    // Client gets client_claim from bond.
    test_scenario::next_tx(&mut scenario, test_utils::client_addr());
    let payout = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&payout) == 5_000);
    test_utils::burn_usdc(payout);

    // Platform gets bond residual (10000 - 5000 = 5000).
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let plat = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&plat) == 5_000);
    test_utils::burn_usdc(plat);

    test_scenario::end(scenario);
}

#[test]
fun settle_broken_conservation_with_market() {
    // Bond=10000, Client claim=5000, Believer=2000, Doubter=1500.
    // Broken: Bond split: 5000→Client, 5000→Platform (residual).
    // Believer stakes (loser): 200 Platform, 400 Client, 1400 Doubters.
    // Doubter claims: 1500 (own) + 1400 (from believers) = 2900.
    // Total out: 5000+5000+200+400+2900 = 13500 ✓
    let mut scenario = mint_oath(5_000);

    // Believer stakes 2000.
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    believer::stake_for<USDC>(
        &mut oath, test_utils::mint_usdc(2_000, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Doubter stakes 1500.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(
        &mut oath, test_utils::mint_usdc(1_500, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // No dims satisfied → broken.
    settle(&mut scenario);

    // Doubter claims pro-rata (sole doubter → 100% of winner pool).
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::winner_payout_pool_value(&oath) == 2900); // 1500 + 0.7*2000
    let mut pos = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos, &mut oath, test_scenario::ctx(&mut scenario));
    assert!(oath::winner_payout_pool_value(&oath) == 0);
    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let payout = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&payout) == 2900);
    test_utils::burn_usdc(payout);

    // Client: 5000 (claim) + 400 (20% of Believer stakes) = 5400.
    test_scenario::next_tx(&mut scenario, test_utils::client_addr());
    let c1 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    let c2 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&c1) + coin::value(&c2) == 5_400);
    test_utils::burn_usdc(c1);
    test_utils::burn_usdc(c2);

    // Platform: 5000 (residual) + 200 (10% believer stakes) = 5200.
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let p1 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    let p2 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&p1) + coin::value(&p2) == 5_200);
    test_utils::burn_usdc(p1);
    test_utils::burn_usdc(p2);

    test_scenario::end(scenario);
}

// ==================== SETTLE BROKEN VIA OTHER DIMS ====================

#[test]
fun settle_broken_via_min_pnl() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut i = 0;
    while (i < 10) {
        oath::record_equity_update<USDC>(&mut oath, 100_000, 1000);
        i = i + 1;
    };
    test_scenario::return_shared(oath);

    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_some());
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun settle_kept_all_dims_pass() {
    let mut scenario = mint_oath(5_000);
    satisfy_dims(&mut scenario);
    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_none());
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EEpochNotEnded)]
fun settle_aborts_before_epoch_end() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    oath::settle_epoch<USDC>(&mut oath, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EAlreadySettled)]
fun double_settle_aborts() {
    let mut scenario = mint_oath(5_000);
    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 3_000_000);
    oath::settle_epoch<USDC>(&mut oath, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// ==================== PRO-RATA MULTI-WINNER ====================

#[test]
fun two_doubters_pro_rata_on_broken() {
    let mut scenario = mint_oath(5_000);

    // Believer stakes 1000.
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    believer::stake_for<USDC>(
        &mut oath, test_utils::mint_usdc(1_000, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Doubter1 stakes 600.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(
        &mut oath, test_utils::mint_usdc(600, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    // Doubter2 stakes 400.
    test_scenario::next_tx(&mut scenario, test_utils::doubter2());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(
        &mut oath, test_utils::mint_usdc(400, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    settle(&mut scenario);

    // Winner pool = DS(1000) + 0.7*BS(1000) = 1000+700 = 1700.
    // Doubter1 (600/1000): 1700 * 600/1000 = 1020.
    // Doubter2 (400/1000): 1700 * 400/1000 = 680.
    // Total: 1020+680 = 1700. ✓

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos1 = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos1, &mut oath, test_scenario::ctx(&mut scenario));
    test_scenario::return_to_sender(&scenario, pos1);
    test_scenario::return_shared(oath);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let p1 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&p1) == 1020);
    test_utils::burn_usdc(p1);

    test_scenario::next_tx(&mut scenario, test_utils::doubter2());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos2 = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos2, &mut oath, test_scenario::ctx(&mut scenario));
    test_scenario::return_to_sender(&scenario, pos2);
    test_scenario::return_shared(oath);

    test_scenario::next_tx(&mut scenario, test_utils::doubter2());
    let p2 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&p2) == 680);
    test_utils::burn_usdc(p2);

    test_scenario::end(scenario);
}

// ==================== PERMISSION GATES ====================

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EZeroStake)]
fun doubter_zero_stake_aborts() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(
        &mut oath, test_utils::mint_usdc(0, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::doubter::EAlreadyClaimed)]
fun doubter_double_claim_aborts() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(
        &mut oath, test_utils::mint_usdc(100, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos = test_scenario::take_from_sender<DoubterPosition<USDC>>(&scenario);
    doubter::claim_payout<USDC>(&mut pos, &mut oath, test_scenario::ctx(&mut scenario));
    doubter::claim_payout<USDC>(&mut pos, &mut oath, test_scenario::ctx(&mut scenario));
    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::believer::EAlreadyClaimed)]
fun believer_double_claim_aborts() {
    let mut scenario = mint_oath(5_000);
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    believer::stake_for<USDC>(
        &mut oath, test_utils::mint_usdc(100, test_scenario::ctx(&mut scenario)),
        &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    satisfy_dims(&mut scenario);
    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut pos = test_scenario::take_from_sender<BelieverPosition<USDC>>(&scenario);
    believer::claim_payout<USDC>(&mut pos, &mut oath, test_scenario::ctx(&mut scenario));
    believer::claim_payout<USDC>(&mut pos, &mut oath, test_scenario::ctx(&mut scenario));
    test_scenario::return_to_sender(&scenario, pos);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

// ==================== AUDIT FIXES (security) ====================

// OATH-1: self-dealing roles rejected at mint (client == promiser).
#[test]
#[expected_failure(abort_code = oathkeeper::oath::ESelfDealingRole)]
fun mint_aborts_when_client_equals_promiser() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::promiser(), 5_000, // client == sender(promiser)
        b"b", 1, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(reservation, b"", b"", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// OATH-4: max_drawdown_bps > 10000 rejected at mint (overflow guard).
#[test]
#[expected_failure(abort_code = oathkeeper::oath::EDrawdownBpsTooHigh)]
fun mint_aborts_drawdown_bps_too_high() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));
    let bad = oath::new_dimensions(10_001, 10, 500, 0); // > MAX_BPS
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), bad,
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 5_000, b"b", 1, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(reservation, b"", b"", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// OATH-2: Kept with Doubters but NO Believers — the 70% must not strand in the pool.
#[test]
fun settle_kept_no_believers_does_not_strand_winner_pool() {
    let mut scenario = mint_oath(5_000);

    // Doubter stakes 1000; no believer stakes.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    doubter::stake_against<USDC>(&mut oath, test_utils::mint_usdc(1_000, test_scenario::ctx(&mut scenario)), &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);

    satisfy_dims(&mut scenario);
    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    // The 70% (700) was routed to platform, not stranded.
    assert!(oath::winner_payout_pool_value(&oath) == 0);
    assert!(oath::winner_stakes_remaining(&oath) == 0);
    test_scenario::return_shared(oath);

    // Platform (deployer) received 10% (100) + redirected 70% (700) = 800.
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let p1 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    let p2 = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&p1) + coin::value(&p2) == 800);
    test_utils::burn_usdc(p1);
    test_utils::burn_usdc(p2);
    test_scenario::end(scenario);
}

// OATH-5: drawdown breached mid-epoch then recovered, no mark_breach — settle still Broken.
#[test]
fun settle_broken_via_drawdown_low_water_mark() {
    let mut scenario = mint_oath(5_000);

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    // Dip below the 20% floor (80000) to 70000, then recover above the pnl floor.
    oath::record_equity_update<USDC>(&mut oath, 70_000, 1000);
    let mut i = 0;
    while (i < 10) { oath::record_equity_update<USDC>(&mut oath, 110_000, 1000); i = i + 1; };
    test_scenario::return_shared(oath);

    settle(&mut scenario);

    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_some()); // Broken via drawdown low-water-mark
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}
