/// Mock USDC for devnet / testnet end-to-end testing + the live app demo.
///
/// Oath<T> is generic over a coin type. On a live network we need a real `Coin<T>` to
/// bond and stake. Using `0x2::sui::SUI` as T would confound the conservation balance-delta
/// check (gas is debited in SUI), so we publish a dedicated test coin instead.
///
/// `init` SHARES the `TreasuryCap` so anyone can self-serve test USDC via `faucet` (the app
/// needs a connected wallet to hold USDC before it can bond/stake). `mint` lets a caller
/// fund an arbitrary recipient/amount (used by the seed script). NOT for mainnet — this is
/// a deliberately unguarded faucet coin with no value.
module oathkeeper::usdc;

use sui::coin::{Self, TreasuryCap};

/// One-time witness. Name must match the module name uppercased.
public struct USDC has drop {}

/// Fixed grant per faucet call: 100,000 USDC — enough to bond an oath and stake a few times.
const FAUCET_AMOUNT: u64 = 100_000;

fun init(witness: USDC, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6, // decimals — mirrors real USDC
        b"USDC",
        b"Mock USDC (Oathkeeper test)",
        b"Test-only USDC for Oathkeeper testnet. Permissionless faucet. No value.",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    // Shared so the faucet entry is permissionless — any wallet can fund itself.
    transfer::public_share_object(treasury);
}

/// Permissionless: mint FAUCET_AMOUNT test-USDC to the caller. Powers the app's
/// "Get test USDC" button so a fresh wallet can bond/stake.
public entry fun faucet(treasury: &mut TreasuryCap<USDC>, ctx: &mut TxContext) {
    coin::mint_and_transfer(treasury, FAUCET_AMOUNT, tx_context::sender(ctx), ctx);
}

/// Mint an arbitrary `amount` to `recipient`. Used by the seed script to fund role wallets
/// with exact amounts. Unguarded (shared cap) — testnet mock coin only.
public entry fun mint(
    treasury: &mut TreasuryCap<USDC>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    coin::mint_and_transfer(treasury, amount, recipient, ctx);
}
