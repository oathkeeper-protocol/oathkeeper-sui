#[test_only]
module oathkeeper::test_utils;

use sui::coin::{Self, Coin};
use oathkeeper::oath::{Self, OathDimensions, StrategyScope};

public struct USDC has drop {}

public fun promiser(): address { @0xA11CE }
public fun client_addr(): address { @0xC11E }
public fun believer(): address { @0xBE11 }
public fun doubter(): address { @0xD0B1 }
public fun doubter2(): address { @0xD0B2 }
public fun exec_addr(): address { @0xEEEE }
public fun deployer(): address { @0xDEAD }

public fun mint_usdc(amount: u64, ctx: &mut TxContext): Coin<USDC> {
    coin::mint_for_testing<USDC>(amount, ctx)
}

public fun burn_usdc(c: Coin<USDC>) {
    coin::burn_for_testing(c);
}

public fun default_dims(): OathDimensions {
    oath::new_dimensions(2000, 10, 500, 0)
}

public fun default_scope(exec: address): StrategyScope {
    oath::new_scope(exec, 1, vector[b"BTC", b"ETH"], 1_000_000)
}
