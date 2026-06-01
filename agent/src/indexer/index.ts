/**
 * Oathkeeper Reconciliation Indexer (skeleton — Day 20 work fills in the diff logic).
 *
 * What this is:
 *   Open-source, deterministic, anyone can run it. Subscribes to every Oathkeeper
 *   event on Sui, maintains a local view of each Oath's claimed trade history, and
 *   diffs it against the bound `exec_addr`'s actual venue history (DeepBook fills via
 *   Sui indexer, Hyperliquid fills via HL API). Discrepancies → `dispute_attestation`.
 *
 * What this is NOT:
 *   - An "AI verifier" — it's a deterministic byte-diff, pitched as such
 *   - A centralized oracle — anyone can spin one up
 *   - A trusted party — disputes are filed on-chain, not resolved here
 *
 * Day 1 (this file): event subscription + pretty-print. Run with `pnpm indexer`.
 * Day 20: add the deterministic diff loop + `dispute_attestation` PTB builder.
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import type { PaginatedEvents } from '@mysten/sui/jsonRpc';
import { config } from '../config.js';
import { log } from '../log.js';
import { EventTypes, qualifyEventType, type EventTypeKey } from '../sui/events.js';

const client = new SuiJsonRpcClient({
  url: config.sui.rpcUrl,
  network: config.sui.network,
});

const packageId = config.oathkeeper.packageId;
if (packageId === '0x0') {
  log.warn(
    { hint: 'set OATHKEEPER_PACKAGE_ID in .env' },
    'package id not set — indexer will subscribe but match nothing',
  );
}

/** Poll-based subscription loop. Sui's WS subscription path is more efficient long-term;
 * this polls for v1 simplicity. Day 20: swap for `subscribeEvent` over WS. */
async function pollEvents(): Promise<void> {
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  const eventTypeKeys = Object.keys(EventTypes) as EventTypeKey[];

  while (true) {
    try {
      // Query each event type separately. The Sui SDK does not support OR queries
      // across multiple full event types in one call.
      for (const key of eventTypeKeys) {
        if (packageId === '0x0') continue;
        const fullType = qualifyEventType(packageId, key);
        const page: PaginatedEvents = await client.queryEvents({
          query: { MoveEventType: fullType },
          cursor: cursor ?? undefined,
          limit: 50,
          order: 'ascending',
        });
        for (const event of page.data) {
          log.info(
            {
              event: key,
              tx: event.id.txDigest,
              ts: event.timestampMs,
              data: event.parsedJson,
            },
            `[${key}]`,
          );
          // Day 20: feed into the per-oath state machine, then diff against venue.
        }
        if (page.nextCursor && page.hasNextPage) {
          cursor = page.nextCursor;
        }
      }
    } catch (err) {
      log.error({ err }, 'poll iteration failed; retrying in 5s');
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

log.info(
  {
    network: config.sui.network,
    rpc: config.sui.rpcUrl,
    packageId,
  },
  'oathkeeper indexer starting (skeleton — Day 20 fills in the diff logic)',
);

void pollEvents();
