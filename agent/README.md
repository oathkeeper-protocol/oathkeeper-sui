# oathkeeper-agent

Off-chain runtime for Oathkeeper-Sui. Hosts the Walrus + Seal pipeline, the DeepBook agent runner, the open-source reconciliation indexer, and the HTTPS uptime prober.

## Setup

```bash
cd agent
pnpm install            # or npm install / bun install
cp .env.example .env    # fill in real testnet keys + RPC URLs
pnpm typecheck          # sanity check the workspace
```

## Subsystems

| Path | Purpose | Sprint day |
|------|---------|------------|
| `src/sui/` | Sui client wrapper, PTB builders, signers | Day 8 |
| `src/walrus/` | Sealed-oath-text upload + per-trade attestation blob batching | Day 9-13 |
| `src/seal/` | Seal encrypt/decrypt wrappers, access-policy helpers | Day 11 |
| `src/indexer/` | Reconciliation indexer — diffs Sui attestations vs venue history | Day 20 |
| `src/runner/` | DeepBook strategy agent (sharp / bold / patient / stoic archetypes) | Day 18-19 |
| `src/prober/` | HTTPS uptime prober — signs and posts ping attestations | Day 17 |
| `src/scripts/` | One-shot demo helpers (mint, stake, settle) | Day 26 |

## Scripts

```bash
pnpm indexer    # watch + relay all OathKeeper events to stdout
pnpm runner     # run the bound exec wallet against DeepBook (testnet)
pnpm prober     # uptime prober loop for a single UptimeOath
pnpm mint       # one-shot: mint a TradingOath
pnpm stake      # one-shot: stake against a given oath ID
pnpm settle     # one-shot: settle a specific oath
```

## Architecture (one screen)

```
                              ┌──────────────┐
                              │ Sui contracts│
                              │  (62 tests)  │
                              └──────┬───────┘
                                     │ events
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
        ┌─────▼─────┐         ┌──────▼──────┐        ┌──────▼──────┐
        │  Runner   │         │   Indexer   │        │   Prober    │
        │ (DeepBook)│         │(diff venue) │        │(HTTPS pings)│
        └─────┬─────┘         └──────┬──────┘        └──────┬──────┘
              │                      │                      │
        ┌─────▼─────┐         ┌──────▼──────┐               │
        │   Sui PTB │         │ dispute_*() │               │
        │record_trade│         │ on diff     │               │
        └───────────┘         └─────────────┘               │
              │                                              │
        ┌─────▼─────┐                                   ┌────▼────┐
        │  Walrus   │                                   │ Walrus  │
        │ (attest)  │                                   │ (pings) │
        └───────────┘                                   └─────────┘
```

## Status

- [x] Workspace scaffold (this commit)
- [x] Reconciliation indexer skeleton (`src/indexer/`)
- [ ] Sui client wrapper + PTB builders
- [ ] Walrus sealed-text upload
- [ ] Seal access-policy module
- [ ] DeepBook V3 agent runner
- [ ] Hyperliquid secondary venue
- [ ] HTTPS uptime prober

Nothing here hits a real network yet. The skeleton is the structure for the Week 2 + 3 work; everything network-touching is implemented and tested when the user is awake.

## Why no Seal SDK pin yet

Per [ARCHITECTURE.md](../docs/ARCHITECTURE.md), the Seal SDK package name was not yet confirmed in the May 20 research pass. Pin on Day 8 before Week 2 starts. Until then `src/seal/` is structural only.
