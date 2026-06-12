/// Witnessed-execution tier for DeepBook oaths: the Oathkeeper trades through this
/// module, which records DeepBook's returned amounts plus an on-chain balance anchor.
module oathkeeper::witnessed;

use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use deepbook::balance_manager::{BalanceManager, DepositCap, TradeCap, WithdrawCap};
use deepbook::pool::Pool;
use oathkeeper::oath::{Self, Oath, OathDimensions, OathType, StrategyScope};
use oathkeeper::oath_registry::Registry;

// === Errors ===
const ENotExecAddr: u64 = 0;
const ETierMismatch: u64 = 1;
const ENotActive: u64 = 2;
const EEpochEnded: u64 = 3;

/// Mint a WITNESSED DeepBook oath. Starting equity is read from the bound
/// BalanceManager rather than supplied by the caller.
public fun mint_witnessed<T>(
    registry: &mut Registry,
    oath_type: OathType,
    dims: OathDimensions,
    scope: StrategyScope,
    bond: Coin<T>,
    client: address,
    client_claim: u64,
    sealed_oath_text_root: vector<u8>,
    binding_nonce: u64,
    balance_manager: &BalanceManager,
    exec_signature: vector<u8>,
    exec_pubkey: vector<u8>,
    valid_from_ms: u64,
    valid_until_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let starting_equity = balance_manager.balance<T>();
    let reservation = oath::start_epoch<T>(
        registry,
        oath_type,
        dims,
        scope,
        bond,
        client,
        client_claim,
        sealed_oath_text_root,
        binding_nonce,
        starting_equity,
        clock,
        ctx,
    );
    let reservation = oath::mark_reservation_witnessed<T>(reservation);
    oath::bind_exec_wallet<T>(
        reservation,
        exec_signature,
        exec_pubkey,
        valid_from_ms,
        valid_until_ms,
        registry,
        clock,
        ctx,
    );
}

/// Witnessed swap: the bound exec wallet sells base for quote through DeepBook.
/// Notional is the returned quote coin value. Quote proceeds are deposited back into the
/// BalanceManager before reading equity, so trade-time and settlement-time anchors measure
/// the same on-chain account. The caller supplies neither value.
public fun trade_via_deepbook<BaseAsset, QuoteAsset>(
    oath: &mut Oath<QuoteAsset>,
    pool: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    deposit_cap: &DepositCap,
    withdraw_cap: &WithdrawCap,
    base_in: Coin<BaseAsset>,
    min_quote_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(sender == oath::exec_addr(oath), ENotExecAddr);
    assert!(oath::verifiability_tier(oath) == oath::tier_witnessed(), ETierMismatch);
    assert!(oath::status(oath) == oath::status_active(), ENotActive);
    assert!(clock::timestamp_ms(clock) < oath::epoch_end_ms(oath), EEpochEnded);

    let (base_remain, quote_out) = pool.swap_exact_base_for_quote_with_manager<BaseAsset, QuoteAsset>(
        balance_manager,
        trade_cap,
        deposit_cap,
        withdraw_cap,
        base_in,
        min_quote_out,
        clock,
        ctx,
    );

    let executed_notional = coin::value(&quote_out);
    balance_manager.deposit_with_cap(deposit_cap, quote_out, ctx);
    let post_equity = balance_manager.balance<QuoteAsset>();
    oath::record_equity_update<QuoteAsset>(oath, post_equity, executed_notional);

    transfer::public_transfer(base_remain, sender);
}

/// Permissionless WITNESSED settlement. Before running the shared settlement math, read the
/// final on-chain BalanceManager equity anchor so a last-minute balance drop cannot bypass
/// drawdown/min-PnL settlement.
public fun settle_epoch_witnessed<T>(
    oath: &mut Oath<T>,
    registry: &mut Registry,
    balance_manager: &BalanceManager,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let final_equity = balance_manager.balance<T>();
    oath::settle_epoch_witnessed_with_anchor<T>(oath, registry, final_equity, clock, ctx);
}
