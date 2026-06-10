/**
 * Walrus SLA-document storage — the "every oath has a confidential contract" plumbing.
 *
 * The canonical pattern (Mysten's OnlyFins/allowlist shape): store the per-oath SLA
 * agreement text as a Walrus blob, commit the content-derived blobId on-chain in the Oath
 * (`sealed_oath_text_root`). The blobId binds the bytes cryptographically — anyone can
 * verify the stored document is unaltered; Seal (roadmap) gates who can *read* it.
 *
 * This uses the public testnet publisher/aggregator HTTP API, which on testnet accepts
 * uploads with no wallet or WAL token for small blobs (<= ~10 MiB) — so it runs with no
 * key and no gas. For production / large blobs, swap to the @mysten/walrus SDK with a
 * funded signer (the dependency is already installed). Endpoints are configurable via env
 * (WALRUS_PUBLISHER_URL / WALRUS_AGGREGATOR_URL); testnet hosts can change across
 * redeployments, so verify them if a call 4xxs.
 */
import { config } from '../config.js';

export interface StoredBlob {
  blobId: string;
  /** 'created' (newly stored) or 'certified' (already existed). */
  state: 'created' | 'certified';
  /** Aggregator URL to read the blob back. */
  readUrl: string;
  /** End epoch the storage is paid through, when reported by the publisher. */
  endEpoch?: number;
}

const PUBLISHER = config.walrus.publisherUrl.replace(/\/$/, '');
const AGGREGATOR = config.walrus.aggregatorUrl.replace(/\/$/, '');

function readUrlFor(blobId: string): string {
  return `${AGGREGATOR}/v1/blobs/${blobId}`;
}

/**
 * Store bytes/text on Walrus testnet via the public publisher. `epochs` is how long the
 * storage is paid for (testnet epoch ~2 days; default from config).
 */
export async function storeBlob(
  data: string | Uint8Array,
  epochs: number = config.walrus.epochs,
): Promise<StoredBlob> {
  const body = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=${epochs}`, {
    method: 'PUT',
    body,
  });
  if (!res.ok) {
    throw new Error(`Walrus publisher PUT failed: ${res.status} ${res.statusText} (${await res.text().catch(() => '')})`);
  }
  const json = (await res.json()) as Record<string, any>;
  // Publisher returns either { newlyCreated: { blobObject: { blobId, storage: { endEpoch } } } }
  // or { alreadyCertified: { blobId, endEpoch } }.
  if (json.newlyCreated?.blobObject?.blobId) {
    const o = json.newlyCreated.blobObject;
    return { blobId: o.blobId, state: 'created', readUrl: readUrlFor(o.blobId), endEpoch: o.storage?.endEpoch };
  }
  if (json.alreadyCertified?.blobId) {
    const o = json.alreadyCertified;
    return { blobId: o.blobId, state: 'certified', readUrl: readUrlFor(o.blobId), endEpoch: o.endEpoch };
  }
  throw new Error(`Walrus publisher returned an unexpected shape: ${JSON.stringify(json).slice(0, 300)}`);
}

/** Read a blob back from the public aggregator. Returns the decoded UTF-8 string. */
export async function readBlob(blobId: string): Promise<string> {
  const res = await fetch(readUrlFor(blobId));
  if (!res.ok) {
    throw new Error(`Walrus aggregator GET failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}
