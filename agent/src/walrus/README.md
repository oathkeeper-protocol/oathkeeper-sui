# Walrus integration — Week 2 Day 8-9, Day 13

## Shipped (testnet, no wallet/gas)

`store.ts` + `cli.ts` store a per-oath SLA document on Walrus testnet via the public
publisher HTTP API and read it back — round-trip verified live. The content-derived blobId
is what you commit on-chain as the Oath's `sealed_oath_text_root`.

```bash
pnpm walrus:demo                 # store a sample SLA doc, read it back, assert round-trip
pnpm walrus:store "<sla text>"   # -> prints blobId + aggregator read URL
pnpm walrus:read <blobId>
```

Remaining: (1) wire the mint flow to call `storeBlob(oathText)` and pass the returned blobId
as `sealedRoot` (the frontend can't hit the public publisher directly if CORS blocks it — do
it server-side or via the @mysten/walrus SDK with a funded signer); (2) layer **Seal** on top
so the doc is encrypted and only the bound exec wallet / client can decrypt (the SDK pseudo
below). Seal is the confidentiality half; Walrus is the storage half (shipped).

---

## Original plan (SDK form, for Seal + large/production blobs)

Two upload paths land here:

## 1. Sealed oath text (Day 9)

```ts
// pseudo — implementation lands Day 9
const sealed = await seal.encrypt(plaintext, oathAccessPolicy);
const { blobId } = await walrus.writeBlob({
  blob: sealed,
  deletable: false,
  epochs: oathEpochCount + 2,
  signer: oathkeeperKeypair,
});
// commit blobId → Oath.sealed_oath_text_root at mint time
```

## 2. Per-trade attestation quilt (Day 13)

```ts
// pseudo — implementation lands Day 13
const files = perTradeData.map((td, i) =>
  WalrusFile.from({ contents: encode(td), identifier: `trade-${oathId}-${i}.json` }),
);
const result = await walrus.writeFiles({
  files,
  epochs: oathEpochCount + 12,
  deletable: false,
  signer: arenaKeypair,
});
```

## Cost model gotcha (see ARCHITECTURE.md)

The signer needs both **SUI** (gas) and **WAL** (storage). The Oathkeeper pays WAL for
their own sealed-oath-text blob. The runner pays WAL for per-trade attestation blobs
(absorbed as protocol operating cost).

## Retry handling

Wrap calls in `try/catch` for `RetryableWalrusClientError` and call `client.reset()`
before retrying. High-level methods auto-retry — use those, not raw shard/sliver ops.
