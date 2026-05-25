#[test_only]
module oathkeeper::test_utils;

use sui::coin::{Self, Coin};
use oathkeeper::oath::{Self, OathDimensions, StrategyScope};

/// Stub USDC coin type for tests. `drop` so it can be created via mint_for_testing.
public struct USDC has drop {}

// === Standard test addresses ===
public fun promiser(): address { @0xA11CE }
public fun doubter(): address { @0xB0B }
public fun doubter2(): address { @0xB0B2 }
public fun lp(): address { @0xC0DE }
public fun exec_addr(): address { @0xEEEE }
public fun exec_addr_alt(): address { @0xEEFF }
public fun deployer(): address { @0xDEAD }

// === Coin helpers ===

public fun mint_usdc(amount: u64, ctx: &mut TxContext): Coin<USDC> {
    coin::mint_for_testing<USDC>(amount, ctx)
}

public fun burn_usdc(c: Coin<USDC>) {
    coin::burn_for_testing(c);
}

// === Oath fixture helpers ===

/// Default dimensions: 20% max drawdown, 10 min trades, 5% min PnL, no volume floor.
public fun default_dims(): OathDimensions {
    oath::new_dimensions(2000, 10, 500, 0)
}

/// Dimensions that always fail the min_trades check (requires 999 trades).
public fun unmeetable_dims(): OathDimensions {
    oath::new_dimensions(2000, 999, 500, 0)
}

/// Default scope: Hyperliquid venue (routes signature verification through the
/// ecdsa_k1 pass-through path so tests don't need real sigs), two allowed assets,
/// 1-million-ms epoch (1000s).
public fun default_scope(exec: address): StrategyScope {
    oath::new_scope(exec, 1, vector[b"BTC", b"ETH"], 1_000_000)
}

/// Scope with a custom epoch duration.
public fun scope_with_epoch(exec: address, epoch_ms: u64): StrategyScope {
    oath::new_scope(exec, 1, vector[b"BTC", b"ETH"], epoch_ms)
}
