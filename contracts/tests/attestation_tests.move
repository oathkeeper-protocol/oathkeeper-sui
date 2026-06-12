#[test_only]
module oathkeeper::attestation_tests;

use sui::clock;
use sui::test_scenario::{Self, Scenario};
use oathkeeper::oath::{Self, Oath};
use oathkeeper::oath_registry::{Self, Registry};
use oathkeeper::attestation;
use oathkeeper::test_utils::{Self, USDC};

fun mint_oath(): Scenario {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    let bond = test_utils::mint_usdc(10_000, test_scenario::ctx(&mut scenario));

    let reservation = oath::start_epoch<USDC>(
        &mut registry, oath::trading_oath(), test_utils::default_dims(),
        test_utils::default_scope(test_utils::exec_addr()),
        bond, test_utils::client_addr(), 5_000,
        b"blob", 42, 100_000, &clock, test_scenario::ctx(&mut scenario),
    );
    oath::bind_exec_wallet<USDC>(
        reservation, b"sig", b"pk", 0, 9_000_000_000_000, &mut registry, &clock, test_scenario::ctx(&mut scenario),
    );
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);
    scenario
}

#[test]
fun fresh_oath_has_no_disputes() {
    let mut scenario = mint_oath();
    test_scenario::next_tx(&mut scenario, test_utils::promiser());
    let oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    assert!(!oath::disputed(&oath));
    assert!(oath::dispute_count(&oath) == 0);
    test_scenario::return_shared(oath);
    test_scenario::end(scenario);
}

#[test]
fun dispute_sets_flag_and_increments_count() {
    let mut scenario = mint_oath();

    // Anyone (here: the doubter) files a dispute — e.g. the reconciler caught a fabricated fill.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    attestation::dispute_attestation<USDC>(&mut oath, b"0xFAKE:0", b"recon:fabricated", test_scenario::ctx(&mut scenario));
    assert!(oath::disputed(&oath));
    assert!(oath::dispute_count(&oath) == 1);
    test_scenario::return_shared(oath);

    // A second, independent dispute accumulates.
    test_scenario::next_tx(&mut scenario, test_utils::believer());
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    attestation::dispute_attestation<USDC>(&mut oath, b"0xFAKE:1", b"recon:fabricated", test_scenario::ctx(&mut scenario));
    assert!(oath::dispute_count(&oath) == 2);
    test_scenario::return_shared(oath);

    test_scenario::end(scenario);
}

#[test]
fun dispute_works_after_settlement() {
    // A dispute can be filed even after settlement (post-hoc proof of fabrication).
    let mut scenario = mint_oath();

    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);
    let mut oath = test_scenario::take_shared<Oath<USDC>>(&scenario);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 2_000_000);
    oath::settle_epoch<USDC>(&mut oath, &mut registry, &clock, test_scenario::ctx(&mut scenario));
    assert!(oath::status(&oath) == oath::status_settled());
    clock::destroy_for_testing(clock);
    test_scenario::return_shared(registry);

    attestation::dispute_attestation<USDC>(&mut oath, b"0xFAKE:0", b"recon:fabricated", test_scenario::ctx(&mut scenario));
    assert!(oath::disputed(&oath));
    assert!(oath::dispute_count(&oath) == 1);
    test_scenario::return_shared(oath);

    test_scenario::end(scenario);
}
