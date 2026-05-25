#[test_only]
module oathkeeper::economics_tests;

use sui::test_scenario;
use sui::coin;
use oathkeeper::economics::{Self, LPPool, LPShare};
use oathkeeper::test_utils::{Self, USDC};

#[test]
fun create_pool_shares_object() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::deployer());

    let pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    assert!(economics::reserves_value(&pool) == 0);
    assert!(economics::total_shares(&pool) == 0);

    test_scenario::return_shared(pool);
    test_scenario::end(scenario);
}

#[test]
fun first_deposit_mints_one_to_one_shares() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::lp());

    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let coin = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    economics::deposit_lp(&mut pool, coin, test_scenario::ctx(&mut scenario));

    assert!(economics::reserves_value(&pool) == 1000);
    assert!(economics::total_shares(&pool) == 1000);
    test_scenario::return_shared(pool);

    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let share = test_scenario::take_from_sender<LPShare<USDC>>(&scenario);
    assert!(economics::share_value(&share) == 1000);
    test_scenario::return_to_sender(&scenario, share);

    test_scenario::end(scenario);
}

#[test]
fun second_deposit_proportional_shares() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));

    // First LP deposit (LP A).
    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let c1 = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    economics::deposit_lp(&mut pool, c1, test_scenario::ctx(&mut scenario));

    // Second LP deposit (different LP) — should get 500 shares for 500 in.
    test_scenario::next_tx(&mut scenario, test_utils::doubter());
    let c2 = test_utils::mint_usdc(500, test_scenario::ctx(&mut scenario));
    economics::deposit_lp(&mut pool, c2, test_scenario::ctx(&mut scenario));

    assert!(economics::reserves_value(&pool) == 1500);
    assert!(economics::total_shares(&pool) == 1500);
    test_scenario::return_shared(pool);
    test_scenario::end(scenario);
}

#[test]
fun deposit_premium_dilutes_existing_shares() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));

    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let c1 = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    economics::deposit_lp(&mut pool, c1, test_scenario::ctx(&mut scenario));

    // Drop a 200 premium into the pool — no new shares minted, existing share value rises.
    let premium = coin::into_balance(test_utils::mint_usdc(200, test_scenario::ctx(&mut scenario)));
    economics::deposit_premium(&mut pool, premium);

    assert!(economics::reserves_value(&pool) == 1200);
    assert!(economics::total_shares(&pool) == 1000);
    test_scenario::return_shared(pool);
    test_scenario::end(scenario);
}

#[test]
fun redeem_full_shares_returns_proportional_assets() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));

    // LP deposits 1000, premium of 200 added.
    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let c1 = test_utils::mint_usdc(1000, test_scenario::ctx(&mut scenario));
    economics::deposit_lp(&mut pool, c1, test_scenario::ctx(&mut scenario));
    let premium = coin::into_balance(test_utils::mint_usdc(200, test_scenario::ctx(&mut scenario)));
    economics::deposit_premium(&mut pool, premium);

    // LP redeems all shares.
    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let share = test_scenario::take_from_sender<LPShare<USDC>>(&scenario);
    economics::redeem_lp(&mut pool, share, test_scenario::ctx(&mut scenario));

    assert!(economics::reserves_value(&pool) == 0);
    assert!(economics::total_shares(&pool) == 0);
    test_scenario::return_shared(pool);

    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let payout = test_scenario::take_from_sender<coin::Coin<USDC>>(&scenario);
    assert!(coin::value(&payout) == 1200); // 1000 + 200 premium
    test_utils::burn_usdc(payout);

    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = oathkeeper::economics::EZeroDeposit)]
fun zero_deposit_aborts() {
    let mut scenario = test_scenario::begin(test_utils::deployer());
    economics::create_pool<USDC>(test_scenario::ctx(&mut scenario));
    test_scenario::next_tx(&mut scenario, test_utils::lp());
    let mut pool = test_scenario::take_shared<LPPool<USDC>>(&scenario);
    let c = test_utils::mint_usdc(0, test_scenario::ctx(&mut scenario));
    economics::deposit_lp(&mut pool, c, test_scenario::ctx(&mut scenario));
    test_scenario::return_shared(pool);
    test_scenario::end(scenario);
}

#[test]
fun split_constants_match_pitch() {
    assert!(economics::kept_promiser_bps() == 6000);
    assert!(economics::kept_lp_bps() == 4000);
    assert!(economics::kept_promiser_bps() + economics::kept_lp_bps() == 10000);
}
