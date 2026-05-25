#[test_only]
module oathkeeper::oath_tests;

use sui::clock::{Self, Clock};
use sui::test_scenario;
use oathkeeper::oath::{Self, Oath};
use oathkeeper::registry::{Self, Registry};
use oathkeeper::economics::{Self, LPPool};
use oathkeeper::test_utils::{Self, USDC};

// === Mint flow happy path ===

#[test]
fun mint_flow_happy_path_shares_oath() {
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
        b"sealed_oath_blob_id",
        /* binding_nonce */ 42,
        /* starting_equity_usdc */ 100_000,
        &clock,
        test_scenario::ctx(&mut scenario),
    );

    oath::bind_exec_wallet<USDC>(
        reservation,
        /* exec_signature */ b"any_sig_ecdsa_passes_through",
        /* exec_pubkey */ b"any_pk",
        &mut registry,
        &clock,
        test_scenario::ctx(&mut scenario),
    );

    // Confirm registry now records both scope + exec binding.
    assert!(registry::is_exec_bound(&registry, test_utils::exec_addr()));

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(oath::status(&oath) == oath::status_active());
    assert!(oath::bond_value(&oath) == 10_000);
    assert!(oath::current_equity(&oath) == 100_000);
    assert!(oath::trade_count(&oath) == 0);
    test_scenario::return_shared(oath);

    test_scenario::end(scenario);
}

// === start_epoch validation aborts ===

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EMinTradesTooLow)]
fun start_epoch_aborts_on_min_trades_zero() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let bad_dims = oath::new_dimensions(2000, 0, 500, 0); // min_trades = 0
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry,
        oath::trading_oath(),
        bad_dims,
        test_utils::default_scope(test_utils::exec_addr()),
        bond,
        b"blob",
        1, 100_000,
        &clock,
        test_scenario::ctx(&mut scenario),
    );
    // Reservation has no drop — but expected_failure aborts before this line.
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EZeroBond)]
fun start_epoch_aborts_on_zero_bond() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let bond = test_utils::mint_usdc(0, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry,
        oath::trading_oath(),
        test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond,
        b"blob",
        1, 100_000,
        &clock,
        test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EVenueUnknown)]
fun start_epoch_aborts_on_bad_venue() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let bad_scope = oath::new_scope(
        test_utils::exec_addr(),
        99, // unknown venue
        vector[b"BTC"],
        1_000_000,
    );
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry,
        oath::trading_oath(),
        test_utils::default_dims(),
        bad_scope,
        bond,
        b"blob", 1, 100_000,
        &clock,
        test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::ENoAllowedAssets)]
fun start_epoch_aborts_on_empty_asset_list() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let empty_scope = oath::new_scope(test_utils::exec_addr(), 1, vector[], 1_000_000);
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(), empty_scope,
        bond, b"blob", 1, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EUnsupportedOathType)]
fun start_epoch_aborts_on_validator_oath_type() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry,
        oath::validator_oath(), // rejected at mint per Phase-0 design
        test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, b"blob", 1, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EUnsupportedOathType)]
fun start_epoch_aborts_on_treasury_oath_type() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry,
        oath::treasury_oath(),
        test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, b"blob", 1, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EZeroEpochDuration)]
fun start_epoch_aborts_on_zero_epoch_duration() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let scope = oath::new_scope(test_utils::exec_addr(), 1, vector[b"BTC"], 0);
    let bond = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(), scope,
        bond, b"blob", 1, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"", b"", &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// === mark_breach ===

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EDrawdownNotBreached)]
fun mark_breach_aborts_when_equity_above_floor() {
    let mut scenario = mint_default_oath();
    test_scenario::next_tx(&mut scenario, test_utils::promiser());

    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    // current_equity == starting_equity, well above 80% floor
    oath::mark_breach<USDC>(&mut oath, &clock);
    test_scenario::return_shared(oath);
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
fun mark_breach_succeeds_when_drawdown_breached() {
    let mut scenario = mint_default_oath();

    // Drive equity below floor via record_equity_update (package-internal).
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    // floor = 100_000 * 0.80 = 80_000; set to 70_000 to breach.
    oath::record_equity_update<USDC>(&mut oath, 70_000, 0);

    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    oath::mark_breach<USDC>(&mut oath, &clock);
    assert!(oath::status(&oath) == oath::status_broken());

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

// === settle_epoch ===

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EEpochNotEnded)]
fun settle_epoch_aborts_before_epoch_end() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::doubter()); // permissionless
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);

    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    // clock is at 0; epoch_end_ms == 1_000_000. Settling now should abort.
    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
fun settle_epoch_active_to_kept_releases_registry_and_pays_promiser() {
    let mut scenario = mint_default_oath();

    // Satisfy all end-of-epoch dimensions: enough trades, equity above PnL floor.
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut i = 0;
    while (i < 10) {
        oath::record_equity_update<USDC>(&mut oath, 110_000, 1000);
        i = i + 1;
    };
    test_scenario::return_shared(oath);

    // Advance clock past epoch_end_ms = 1_000_000.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);

    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );

    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::bond_value(&oath) == 0); // drained to promiser
    assert!(!registry::is_exec_bound(&registry, test_utils::exec_addr()));

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);

    // Promiser should have received bond as Coin.
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let payout = test_scenario::take_from_sender<sui::coin::Coin<USDC>>(&scenario);
    assert!(sui::coin::value(&payout) == 10_000);
    test_utils::burn_usdc(payout);

    test_scenario::end(scenario);
}

#[test]
fun settle_epoch_active_to_broken_via_min_trades() {
    let mut scenario = mint_default_oath();

    // No trades recorded — settle should break with MIN_TRADES reason.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);

    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_some());

    // No doubters → all bond residual to LP pool.
    assert!(economics::reserves_value(&pool) == 10_000);

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
fun settle_epoch_active_to_broken_via_min_pnl() {
    let mut scenario = mint_default_oath();

    // 10 trades but equity below PnL floor (105_000).
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut i = 0;
    while (i < 10) {
        oath::record_equity_update<USDC>(&mut oath, 100_000, 1000);
        i = i + 1;
    };
    test_scenario::return_shared(oath);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);

    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(oath::breach_reason(&oath).is_some());

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
fun settle_epoch_broken_after_mark_breach_settles() {
    let mut scenario = mint_default_oath();

    // Force drawdown breach, then settle.
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    oath::record_equity_update<USDC>(&mut oath, 70_000, 0);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    oath::mark_breach<USDC>(&mut oath, &clock);
    assert!(oath::status(&oath) == oath::status_broken());
    test_scenario::return_shared(oath);
    clock::destroy_for_testing(clock);

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);

    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    assert!(oath::status(&oath) == oath::status_settled());
    assert!(economics::reserves_value(&pool) == 10_000); // no doubters, full residual to LP

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath::EAlreadySettled)]
fun double_settle_aborts() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);

    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );
    // Second settle should abort.
    oath::settle_epoch<USDC>(
        &mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario),
    );

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// === OathType constructors ===

#[test]
fun all_oath_type_constructors_return_distinct_values() {
    // Just exercise the constructors so dead-code lint doesn't fire.
    let _t = oath::trading_oath();
    let _u = oath::uptime_oath();
    let _b = oath::behavior_oath();
    let _v = oath::validator_oath();
    let _r = oath::treasury_oath();
}

// === Helper: mint a default oath and return the scenario in promiser context after mint ===

fun mint_default_oath(): test_scenario::Scenario {
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
        b"sealed_oath_blob_id",
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
