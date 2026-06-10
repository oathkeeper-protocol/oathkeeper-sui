/**
 * Venue sources — where the reconciler gets the AUTHORITATIVE fill record to diff against
 * the operator's on-chain attestations.
 *
 * The discriminator that makes Oathkeeper trustless is WHERE THE GROUND TRUTH LIVES:
 *  - DeepBook (on Sui): every fill is an on-chain object/event. The chain IS the oracle —
 *    a DeepBook venue source is authoritative, so a fabricated attestation is provable by
 *    anyone with an RPC endpoint. `DeepBookVenueSource`.
 *  - Hyperliquid (another chain): Sui can't read it. Reconciliation needs the HL API (or a
 *    Nautilus/zkTLS attestation). No adapter in v1 -> 'unverifiable', stated honestly.
 *  - Fixture: a deterministic, authoritative record for tests/demos. `FixtureVenueSource`.
 */
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import type { VenueFill } from './types.js';

export interface VenueSource {
  readonly name: string;
  /** True iff this source holds the complete truth for the venue (enables 'clean'/'discrepancies'). */
  readonly authoritative: boolean;
  /** True iff fills carry only an id (no asset/notional) -> mismatch check is skipped. */
  readonly existenceOnly: boolean;
  fills(execAddr: string): Promise<VenueFill[]>;
}

/** A fixed, authoritative fill record. Used by tests and the deterministic demo path. */
export class FixtureVenueSource implements VenueSource {
  readonly name = 'fixture';
  readonly authoritative = true;
  readonly existenceOnly = false;
  constructor(private readonly _fills: VenueFill[]) {}
  async fills(): Promise<VenueFill[]> {
    return this._fills;
  }
}

/** Honest source for any venue we have no adapter for yet (e.g. Hyperliquid in v1). */
export class UnverifiableVenueSource implements VenueSource {
  readonly authoritative = false;
  readonly existenceOnly = true;
  constructor(public readonly name: string) {}
  async fills(): Promise<VenueFill[]> {
    return [];
  }
}

/**
 * Live DeepBook source. v1 = digest-existence proof: it lists transactions SENT BY the
 * bound exec wallet that called the configured DeepBook package, and treats each such tx
 * digest as a real fill. This catches the headline exploit — attesting fills that never
 * happened on-chain. (Asset/notional-level cross-check by parsing DeepBook fill events is
 * the documented next refinement; hence `existenceOnly = true`.)
 *
 * Requires `deepbookPackageId`. Without it we cannot identify DeepBook txns, so the source
 * is non-authoritative ('unverifiable') rather than silently wrong.
 */
export class DeepBookVenueSource implements VenueSource {
  readonly name = 'deepbook';
  readonly existenceOnly = true;
  readonly authoritative: boolean;
  constructor(
    private readonly client: SuiJsonRpcClient,
    private readonly deepbookPackageId: string | undefined,
  ) {
    this.authoritative = !!deepbookPackageId && deepbookPackageId !== '0x0';
  }

  async fills(execAddr: string): Promise<VenueFill[]> {
    if (!this.authoritative) return [];
    const pkg = this.deepbookPackageId!;
    const out: VenueFill[] = [];
    let cursor: string | null = null;
    // Page through the exec wallet's sent transactions; keep those touching DeepBook.
    for (let page = 0; page < 20; page++) {
      const res = await this.client.queryTransactionBlocks({
        filter: { FromAddress: execAddr },
        options: { showInput: true },
        cursor: cursor ?? undefined,
        limit: 50,
        order: 'ascending',
      });
      for (const tx of res.data) {
        const txns =
          (tx.transaction?.data?.transaction as { transactions?: unknown[] })?.transactions ?? [];
        const touchesDeepBook = JSON.stringify(txns).includes(pkg);
        if (touchesDeepBook) {
          out.push({ venueTxHash: tx.digest, asset: '', notional: 0n, timestampMs: Number(tx.timestampMs ?? 0) });
        }
      }
      if (!res.hasNextPage || !res.nextCursor) break;
      cursor = res.nextCursor;
    }
    return out;
  }
}

/** Raw DeepBook v3 `OrderFilled` event shape (parsedJson). Quantities/timestamp are u64 strings. */
export interface OrderFilledEvent {
  base_quantity: string;
  quote_quantity: string;
  price: string;
  maker_balance_manager_id: string;
  taker_balance_manager_id: string;
  timestamp: string;
}

/**
 * PURE mapper: DeepBook `OrderFilled` events -> VenueFills for one BalanceManager. The operator
 * is the maker or taker on a fill iff their bound BalanceManager id matches. notional is the
 * quote_quantity (the oath's quote denomination); venueTxHash is the fill's tx digest, which is
 * what a self-reporting operator references in an attestation. Deterministic and I/O-free, so it
 * is unit-tested with fixtures.
 */
export function fillsFromOrderFilled(
  events: { txDigest: string; parsedJson: OrderFilledEvent }[],
  balanceManagerId: string,
  assetLabel: string,
): VenueFill[] {
  const out: VenueFill[] = [];
  for (const e of events) {
    const j = e.parsedJson;
    const involved = j.taker_balance_manager_id === balanceManagerId || j.maker_balance_manager_id === balanceManagerId;
    if (!involved) continue;
    out.push({
      venueTxHash: e.txDigest,
      asset: assetLabel,
      notional: BigInt(j.quote_quantity),
      timestampMs: Number(j.timestamp),
    });
  }
  return out;
}

/**
 * Live, FILL-LEVEL DeepBook source for the DISPUTABLE detection layer. Parses `OrderFilled`
 * events for the operator's bound BalanceManager, so the reconciler can cross-check a
 * self-reporting operator's attested notional against the venue's own fills (existenceOnly=false).
 *
 * This is detection, NOT trustless settlement — for WITNESSED oaths the contract already settles
 * on-chain. It powers the honest DISPUTABLE tier (maker/limit fills, Hyperliquid bridging, etc.).
 */
export class DeepBookOrderFilledVenueSource implements VenueSource {
  readonly name = 'deepbook-orderfilled';
  readonly existenceOnly = false;
  readonly authoritative: boolean;
  constructor(
    private readonly client: SuiJsonRpcClient,
    private readonly deepbookPackageId: string | undefined,
    private readonly balanceManagerId: string,
    private readonly assetLabel = '',
  ) {
    this.authoritative = !!deepbookPackageId && deepbookPackageId !== '0x0';
  }

  async fills(): Promise<VenueFill[]> {
    if (!this.authoritative) return [];
    const fullType = `${this.deepbookPackageId}::order_info::OrderFilled`;
    const collected: { txDigest: string; parsedJson: OrderFilledEvent }[] = [];
    let cursor: { txDigest: string; eventSeq: string } | null = null;
    for (let page = 0; page < 50; page++) {
      const res = await this.client.queryEvents({
        query: { MoveEventType: fullType },
        cursor: cursor ?? undefined,
        limit: 50,
        order: 'ascending',
      });
      for (const e of res.data) {
        collected.push({ txDigest: e.id.txDigest, parsedJson: e.parsedJson as OrderFilledEvent });
      }
      if (!res.hasNextPage || !res.nextCursor) break;
      cursor = res.nextCursor;
    }
    return fillsFromOrderFilled(collected, this.balanceManagerId, this.assetLabel);
  }
}
