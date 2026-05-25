# Walrus integration — Week 2 Day 8-9, Day 13

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
