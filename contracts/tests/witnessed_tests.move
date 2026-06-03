#[test_only]
module oathkeeper::witnessed_tests;

use sui::clock;
use sui::test_scenario::{Self, Scenario};
use oathkeeper::oath::{Self, Oath};
use oathkeeper::registry::{Self, Registry};
use oathkeeper::attestation;
use oathkeeper::test_utils::{Self, USDC};

// Mint a WITNESSED oath: start_epoch -> mark_reservation_witnessed -> bind_exec_wallet.
// `starting_equity` stands in for the on-chain balance() read the witnessed mint entry
// performs (the chain anchor). venue is orthogonal to tier at the core level; the
// witnessed::trade_via_deepbook entry (U4) enforces venue=DeepBook.
fun mint_witnessed_oath(starting_equity: u64): Scenario {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 5_000,
        b"blob", 42, starting_equity, &clock, test_scenario::ctx(&mut scenario),
    );
    let reservation = oath::mark_reservation_witnessed<USDC>(reservation);
    oath::bind_exec_wallet<USDC>(
        reservation, b"sig", b"pk", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    scenario
}

// Apply N witnessed fills via the same package-internal mutator trade_via_deepbook calls,
// using chain-derived values (post-swap equity + executed notional) — NOT operator input.
fun apply_witnessed_fills(scenario: &mut Scenario, equity_each: u64, notional_each: u64, n: u64) {
    test_scenario::next_tx(scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(scenario);
    let mut i = 0;
    while (i < n) {
        oath::record_equity_update<USDC>(&mut oath, equity_each, notional_each);
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

#[test]
fun witnessed_mint_sets_tier_and_chain_anchor() {
    let mut scenario = mint_witnessed_oath(100_000);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::verifiability_tier(&oath) == oath::tier_witnessed());
    // The anchor is the (mock) chain balance, carried as starting + current + low-water-mark.
    assert!(oath::starting_equity(&oath) == 100_000);
    assert!(oath::current_equity(&oath) == 100_000);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun self_reported_mint_defaults_to_self_reported_tier() {
    // Sanity: the unchanged self-reported path still produces SELF_REPORTED oaths.
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 5_000, b"blob", 42, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(reservation, b"sig", b"pk", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::verifiability_tier(&oath) == oath::tier_self_reported());
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::attestation::ETierMismatch)]
fun record_trade_rejected_on_witnessed_oath() {
    // Unforgeability: the operator's self-reported record_trade is barred on WITNESSED oaths.
    let mut scenario = mint_witnessed_oath(100_000);
    test_scenario::next_tx(&mut scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    attestation::record_trade<USDC>(
        &mut oath, b"0xfake", b"BTC", 10_000, false, 110_000, 1_000, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun witnessed_kept_all_dims_pass() {
    // 10 witnessed fills bring equity to 110_000 (> pnl floor 100_500), volume 10_000 — all dims hold.
    let mut scenario = mint_witnessed_oath(100_000);
    apply_witnessed_fills(&mut scenario, 110_000, 1_000, 10);
    settle(&mut scenario);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_none()); // Kept
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun witnessed_broken_on_drawdown_low_water_mark() {
    // Enough trades, but one witnessed fill dips equity below the 20% drawdown floor (80_000)
    // then recovers. The low-water-mark must still settle BROKEN on drawdown.
    let mut scenario = mint_witnessed_oath(100_000);
    apply_witnessed_fills(&mut scenario, 110_000, 1_000, 5);
    apply_witnessed_fills(&mut scenario, 75_000, 1_000, 1);  // dip below floor
    apply_witnessed_fills(&mut scenario, 110_000, 1_000, 4);  // recover
    settle(&mut scenario);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_some()); // Broken (drawdown)
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun witnessed_dead_operator_breaks_on_min_trades() {
    // Zero witnessed fills: trade_count 0 < min_trades 10. No entry can inject a fake count,
    // so a dead operator who self-reports nothing on-chain settles BROKEN.
    let mut scenario = mint_witnessed_oath(100_000);
    settle(&mut scenario);
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_some()); // Broken (min_trades)
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}
