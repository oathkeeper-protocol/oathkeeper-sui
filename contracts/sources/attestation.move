/// Per-trade attestation pipeline.
///
/// In v1 (Week 1) this module ships a single `record_trade` entry covering the TradingOath
/// path: validate asset allowlist, push equity / volume / count update into the Oath,
/// emit a `TradeAttested` event. Walrus blob commitment is set on the Oath at mint
/// (sealed_oath_text_root); per-trade attestation blobs (Week 2 Day 13) commit via a
/// separate `record_trade_with_blob` extension that lands once Walrus is wired in.
///
/// Adapter dispatch on OathType lands in Week 2 Day 10 — at that point this module's
/// internals refactor onto `attestation_adapter`. The entry surface here stays stable.
module oathkeeper::attestation;

use sui::clock::Clock;
use oathkeeper::oath::Oath;

// === Errors ===
const EOathNotActive: u64 = 0;
const EAssetNotAllowed: u64 = 1;
const EEpochEnded: u64 = 2;
const ENotExecAddr: u64 = 3;
const EOathTypeNotSupported: u64 = 4;

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

/// Called by the bound exec_addr (or arena server with delegated authority — TBD Day 4).
/// Validates asset is in allowlist, oath is Active, epoch not ended; updates equity/count/volume.
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
) { abort 0 }

// === Entry: dispute a recorded attestation ===

/// Any wallet can dispute. Off-chain reconciliation indexer surfaces the discrepancy;
/// dispute resolution (Week 3 Day 21) decides what `mark_breach_by_dispute` does.
public entry fun dispute_attestation<T>(
    oath: &mut Oath<T>,
    venue_tx_hash: vector<u8>,
    proof: vector<u8>,
    ctx: &mut TxContext,
) { abort 0 }
