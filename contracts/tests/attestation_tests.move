#[test_only]
module oathkeeper::attestation_tests;

use sui::clock::{Self, Clock};
use sui::test_scenario::{Self, Scenario};
use oathkeeper::attestation;
use oathkeeper::oath::{Self, Oath};
use oathkeeper::registry::{Self, Registry};
use oathkeeper::economics;
use oathkeeper::test_utils::{Self, USDC};

// === Helper: mint a default oath bound to `test_utils::exec_addr()` ===

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

#[test]
fun record_trade_happy_path_updates_oath() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    attestation::record_trade<USDC>(
        &mut oath,
        b"0xdeadbeef",
        b"BTC",
        /* pnl_delta */ 500,
        /* pnl_negative */ false,
        /* equity_after */ 105_000,
        /* notional */ 2_000,
        &clock,
        test_scenario::ctx(&mut scenario),
    );

    assert!(oath::current_equity(&oath) == 105_000);
    assert!(oath::trade_count(&oath) == 1);
    assert!(oath::cumulative_volume(&oath) == 2_000);

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::attestation::ENotExecAddr)]
fun record_trade_aborts_for_non_exec_caller() {
    let mut scenario = mint_default_oath();

    // Caller is the promiser, NOT the bound exec_addr.
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    attestation::record_trade<USDC>(
        &mut oath, b"hash", b"BTC", 0, false, 100_000, 1_000, &clock, test_scenario::ctx(&mut scenario),
    );

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::attestation::EAssetNotAllowed)]
fun record_trade_aborts_for_disallowed_asset() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    // Default scope allows BTC + ETH; SOL should reject.
    attestation::record_trade<USDC>(
        &mut oath, b"hash", b"SOL", 0, false, 100_000, 1_000, &clock, test_scenario::ctx(&mut scenario),
    );

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::attestation::EEpochEnded)]
fun record_trade_aborts_after_epoch_end() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000); // past epoch_end_ms (1_000_000)

    attestation::record_trade<USDC>(
        &mut oath, b"hash", b"BTC", 0, false, 100_000, 1_000, &clock, test_scenario::ctx(&mut scenario),
    );

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::attestation::EOathNotActive)]
fun record_trade_aborts_on_settled_oath() {
    let mut scenario = mint_default_oath();

    // Settle Broken first (no trades → min_trades breach).
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut pool = test_scenario::take_shared<economics::LPPool<USDC>>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    oath::settle_epoch<USDC>(&mut oath, &mut registry, &mut pool, &clock, test_scenario::ctx(&mut scenario));
    test_scenario::return_shared(pool);
    test_scenario::return_shared(registry);
    test_scenario::return_shared(oath);
    clock::destroy_for_testing(clock);

    // Now record_trade as exec_addr — status check fires first (before clock check), so
    // EOathNotActive is the expected abort even though clock is also past epoch end.
    test_scenario::next_tx(&mut scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    attestation::record_trade<USDC>(
        &mut oath, b"hash", b"BTC", 0, false, 100_000, 1_000, &clock, test_scenario::ctx(&mut scenario),
    );

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun dispute_attestation_emits_event_without_state_change() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);

    attestation::dispute_attestation<USDC>(
        &oath, b"0xdeadbeef", b"proof_bytes", test_scenario::ctx(&mut scenario),
    );

    // No state change; dispute resolution lands Day 21.
    assert!(oath::trade_count(&oath) == 0);
    assert!(oath::status(&oath) == oath::status_active());

    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun record_multiple_trades_accumulates() {
    let mut scenario = mint_default_oath();

    test_scenario::next_tx(&mut scenario, test_utils::exec_addr());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let mut i = 0;
    while (i < 5) {
        attestation::record_trade<USDC>(
            &mut oath, b"hash", b"ETH", 100, false, 100_500, 1_000, &clock, test_scenario::ctx(&mut scenario),
        );
        i = i + 1;
    };

    assert!(oath::trade_count(&oath) == 5);
    assert!(oath::cumulative_volume(&oath) == 5_000);
    assert!(oath::current_equity(&oath) == 100_500);

    clock::destroy_for_testing(clock);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}
