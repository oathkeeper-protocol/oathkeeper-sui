/// Per-trade attestation pipeline.
///
/// In v1 (Week 1) this module ships a single `record_trade` entry covering the TradingOath
/// path: validate asset allowlist, validate caller is the bound `exec_addr`, push
/// equity / volume / count update into the Oath, emit a `TradeAttested` event.
///
/// Walrus blob commitment is set on the Oath at mint (`sealed_oath_text_root`); per-trade
/// attestation blobs (Week 2 Day 13) commit via a separate `record_trade_with_blob`
/// extension that lands once Walrus is wired in.
///
/// Adapter dispatch on OathType lands in Week 2 Day 10 — at that point this module's
/// internals refactor onto `attestation_adapter`. The entry surface here stays stable.
module oathkeeper::attestation;

use sui::clock::{Self, Clock};
use sui::event;
use oathkeeper::oath::{Self, Oath};

// === Errors ===
const EOathNotActive: u64 = 0;
const EAssetNotAllowed: u64 = 1;
const EEpochEnded: u64 = 2;
const ENotExecAddr: u64 = 3;

// === Events ===

public struct TradeAttested has copy, drop {
    oath_id: ID,
    venue_tx_hash: vector<u8>,
    asset: vector<u8>,
    pnl_delta: u64,
    /// `pnl_delta` is unsigned; this flag indicates negative.
    pnl_negative: bool,
    equity_after: u64,
    notional: u64,
    timestamp_ms: u64,
}

public struct AttestationDisputed has copy, drop {
    oath_id: ID,
    venue_tx_hash: vector<u8>,
    disputer: address,
}

// === Entry: record a trade fill ===

/// Called by the bound `exec_addr`. Validates asset is in allowlist, oath is Active,
/// epoch not ended; updates equity/count/volume via the oath module's package-internal
/// `record_equity_update`.
public entry fun record_trade<T>(
    oath: &mut Oath<T>,
    venue_tx_hash: vector<u8>,
    asset: vector<u8>,
    pnl_delta: u64,
    pnl_negative: bool,
    equity_after: u64,
    notional: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // --- Gates ---
    assert!(oath::status(oath) == oath::status_active(), EOathNotActive);
    let now_ms = clock::timestamp_ms(clock);
    assert!(now_ms < oath::epoch_end_ms(oath), EEpochEnded);

    // Caller authorization: only the bound exec wallet can attest its own trades.
    // (Reconciliation indexer, off-chain, verifies the attestation matches the venue's
    // own fill history — that's the second-layer check; this is the first-layer access
    // control.)
    assert!(tx_context::sender(ctx) == oath::exec_addr(oath), ENotExecAddr);

    // Asset allowlist: trades must be on one of the scope's allowed assets.
    let allowed = oath::scope_allowed_assets(oath::scope(oath));
    assert!(asset_in_allowlist(allowed, &asset), EAssetNotAllowed);

    // --- Update oath state via package-internal mutator ---
    oath::record_equity_update<T>(oath, equity_after, notional);

    event::emit(TradeAttested {
        oath_id: object::id(oath),
        venue_tx_hash,
        asset,
        pnl_delta,
        pnl_negative,
        equity_after,
        notional,
        timestamp_ms: now_ms,
    });
}

// === Entry: dispute a recorded attestation ===

/// Any wallet can dispute. Off-chain reconciliation indexer surfaces the discrepancy;
/// dispute resolution (Week 3 Day 21) decides what `mark_breach_by_dispute` does with
/// the proof. For Week 1, this just emits an event so the indexer can pick it up.
public entry fun dispute_attestation<T>(
    oath: &Oath<T>,
    venue_tx_hash: vector<u8>,
    _proof: vector<u8>,
    ctx: &mut TxContext,
) {
    event::emit(AttestationDisputed {
        oath_id: object::id(oath),
        venue_tx_hash,
        disputer: tx_context::sender(ctx),
    });
}

// === Helpers ===

fun asset_in_allowlist(allowed: &vector<vector<u8>>, asset: &vector<u8>): bool {
    let mut i = 0;
    let n = vector::length(allowed);
    while (i < n) {
        if (vector::borrow(allowed, i) == asset) return true;
        i = i + 1;
    };
    false
}
