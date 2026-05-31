/// Mock USDC for devnet / testnet end-to-end testing.
///
/// Oath<T> is generic over a coin type. On a live network we need a real `Coin<T>` to
/// bond and stake. Using `0x2::sui::SUI` as T would confound the conservation balance-delta
/// check (gas is debited in SUI), so we publish a dedicated test coin instead.
///
/// `init` creates the currency and hands the `TreasuryCap` to the publisher; `mint` lets
/// the publisher fund the e2e wallets (oathkeeper / believer / doubter). NOT for mainnet.
module oathkeeper::usdc;

use sui::coin::{Self, TreasuryCap};

/// One-time witness. Name must match the module name uppercased.
public struct USDC has drop {}

fun init(witness: USDC, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6, // decimals — mirrors real USDC
        b"USDC",
        b"Mock USDC (Oathkeeper test)",
        b"Test-only USDC for Oathkeeper devnet/testnet end-to-end runs. No value.",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, tx_context::sender(ctx));
}

/// Mint `amount` test-USDC to `recipient`. Gated only by holding the TreasuryCap,
/// which lives with the publisher. Used to fund e2e wallets.
public entry fun mint(
    treasury: &mut TreasuryCap<USDC>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    coin::mint_and_transfer(treasury, amount, recipient, ctx);
}
