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
