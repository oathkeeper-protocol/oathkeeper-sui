#[test_only]
module oathkeeper::oath_registry_tests;

use sui::test_scenario;
use oathkeeper::oath_registry::{Self, Registry};
use oathkeeper::test_utils;

// === compute_scope_hash properties ===

#[test]
fun scope_hash_is_deterministic() {
    let h1 = oath_registry::compute_scope_hash(
        @0xAA,
        0,
        vector[b"BTC", b"ETH"],
        1_000_000,
        2000, 10, 500, 0,
        0,
    );
    let h2 = oath_registry::compute_scope_hash(
        @0xAA,
        0,
        vector[b"BTC", b"ETH"],
        1_000_000,
        2000, 10, 500, 0,
        0,
    );
    assert!(h1 == h2);
}

#[test]
fun scope_hash_differs_on_oath_type_tag() {
    let h_trading = oath_registry::compute_scope_hash(
        @0xAA, 0, vector[b"BTC"], 1_000_000, 2000, 10, 500, 0, 0,
    );
    let h_uptime = oath_registry::compute_scope_hash(
        @0xAA, 0, vector[b"BTC"], 1_000_000, 2000, 10, 500, 0, 1,
    );
    assert!(h_trading != h_uptime);
}

#[test]
fun scope_hash_differs_on_exec_addr() {
    let h1 = oath_registry::compute_scope_hash(
        @0xAA, 0, vector[b"BTC"], 1_000_000, 2000, 10, 500, 0, 0,
    );
    let h2 = oath_registry::compute_scope_hash(
        @0xBB, 0, vector[b"BTC"], 1_000_000, 2000, 10, 500, 0, 0,
    );
    assert!(h1 != h2);
}

#[test]
fun scope_hash_differs_on_dimensions() {
    let h1 = oath_registry::compute_scope_hash(
        @0xAA, 0, vector[b"BTC"], 1_000_000, 2000, 10, 500, 0, 0,
    );
    let h2 = oath_registry::compute_scope_hash(
        @0xAA, 0, vector[b"BTC"], 1_000_000, 2000, 11, 500, 0, 0,
    );
    assert!(h1 != h2);
}

// === Scope reservation table ===

#[test]
fun reserve_then_has_scope_is_true() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    let hash = b"test_scope_hash_32_bytes________";
    let oath_id = object::id_from_address(@0xDEADBEEF);
    assert!(!oath_registry::has_scope(&registry, test_utils::promiser(), hash));

    oath_registry::reserve_scope(
        &mut registry,
        test_utils::promiser(),
        hash,
        oath_id,
    );

    assert!(oath_registry::has_scope(&registry, test_utils::promiser(), hash));

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
fun release_scope_clears_it() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    let hash = b"test_scope_hash_32_bytes________";
    let oath_id = object::id_from_address(@0xDEADBEEF);

    oath_registry::reserve_scope(&mut registry, test_utils::promiser(), hash, oath_id);
    oath_registry::release_scope(&mut registry, test_utils::promiser(), hash);

    assert!(!oath_registry::has_scope(&registry, test_utils::promiser(), hash));

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath_registry::EScopeAlreadyRegistered)]
fun double_reserve_aborts() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    let hash = b"test_scope_hash_32_bytes________";
    let oath_id = object::id_from_address(@0xDEADBEEF);

    oath_registry::reserve_scope(&mut registry, test_utils::promiser(), hash, oath_id);
    oath_registry::reserve_scope(&mut registry, test_utils::promiser(), hash, oath_id);

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath_registry::EScopeNotFound)]
fun release_unknown_scope_aborts() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    oath_registry::release_scope(
        &mut registry,
        test_utils::promiser(),
        b"nope_____________________________",
    );

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

// === Exec binding table ===

#[test]
fun bind_then_is_exec_bound_is_true() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    let exec = test_utils::exec_addr();
    let oath_id = object::id_from_address(@0xDEADBEEF);
    assert!(!oath_registry::is_exec_bound(&registry, exec));

    oath_registry::bind_exec(&mut registry, exec, oath_id);
    assert!(oath_registry::is_exec_bound(&registry, exec));

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
fun unbind_clears_exec() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    let exec = test_utils::exec_addr();
    let oath_id = object::id_from_address(@0xDEADBEEF);

    oath_registry::bind_exec(&mut registry, exec, oath_id);
    oath_registry::unbind_exec(&mut registry, exec);
    assert!(!oath_registry::is_exec_bound(&registry, exec));

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::oath_registry::EExecWalletBound)]
fun double_bind_aborts() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    oath_registry::init_for_testing(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());
    let mut registry = test_scenario::take_shared<Registry>(&scenario);

    let exec = test_utils::exec_addr();
    let oath_id = object::id_from_address(@0xDEADBEEF);

    oath_registry::bind_exec(&mut registry, exec, oath_id);
    oath_registry::bind_exec(&mut registry, exec, oath_id);

    test_scenario::return_shared(registry);
    test_scenario::end(scenario);
}
