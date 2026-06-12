# Overnight Indexer/Reconciler Proof

Date: 2026-06-13
Worker branch: `amrrobb/overnight-indexer-proof-codex`

## Scope

Audit whether the repo has a real indexer service or deterministic reconciler scripts, run the available agent recon/demo/smoke checks, verify the known settled oath arithmetic, and identify missing indexer work before mainnet/demo.

Locked context honored: DeFi & Payments track, commitment market language, no Claude memory writes, no `brew upgrade sui`, no secrets printed.

## Repository State

- `.context/CODEX-HANDOFF.md`: absent in this worktree.
- `bd onboard`: blocked because `bd` is not installed in this shell (`zsh: command not found: bd`).
- Required docs/code read: `STRATEGY.md`, `CLAUDE.md`, `agent/package.json`, `agent/src/recon/**`, plus `agent/src/indexer/index.ts`, `agent/src/sui/client.ts`, and `agent/src/config.ts`.

## What Exists

The repo currently has a deterministic reconciler/verifier suite, not a production indexer service.

- `agent/src/recon/reconcile.ts`: pure deterministic diff core, no I/O, compares attested fills to venue fills by `venueTxHash`, with optional asset/notional mismatch checks when the venue source is not `existenceOnly`.
- `agent/src/recon/cli.ts`: one-shot reconciler CLI that reads one oath, decodes `TradeAttested` events, selects a venue source, prints a verdict, and can optionally file disputes if credentials are configured.
- `agent/src/recon/venue.ts`: fixture source, unverifiable source, digest-existence DeepBook source, and a fill-level DeepBook `OrderFilled` event mapper/source.
- `agent/src/recon/verify.ts`: one-shot read-only settlement verifier that re-derives the 10/20/70 split and conservation from chain events.
- `agent/src/indexer/index.ts`: polling skeleton only. It pretty-prints package events and explicitly says the per-oath state machine and venue diff loop are future work.

## Fix Applied

I adjusted reconciler proof output so non-authoritative venues do not look like substantiated disputes.

- Before: Hyperliquid/unverifiable reports still set `disputable=true` and printed `[! fabricated]`, even though the venue source was non-authoritative.
- After: non-authoritative venue gaps produce `verdict=unverifiable`, `disputable=false`, and CLI rows display `[. unverified]`; authoritative DeepBook/fixture fabricated or mismatched fills still produce `discrepancies` and remain disputable.

Files changed:

- `agent/src/recon/reconcile.ts`
- `agent/src/recon/cli.ts`
- `agent/src/recon/reconcile.test.ts`

## Environment Notes

`agent/node_modules` was missing initially. `pnpm install --frozen-lockfile` installed dependencies from the lockfile.

The default PATH resolves `/usr/local/bin/node` v18.16.1 before the NVM Node. The package requires Node >=20, and Vitest/Rolldown fails under Node 18 (`node:util` lacks `styleText`). All passing checks below were run with:

```bash
PATH="$NVM_BIN:$PATH" ...
```

This resolves Node to the NVM runtime (`v23.3.0`) and avoids the false-negative test failure.

## Commands Run

### Typecheck

```bash
cd agent && PATH="$NVM_BIN:$PATH" pnpm typecheck
```

Result: pass.

```text
tsc --noEmit
```

### Tests

```bash
cd agent && PATH="$NVM_BIN:$PATH" pnpm test
```

Result: pass.

```text
Test Files  3 passed (3)
Tests       14 passed (14)
```

### Reconciler Demo

```bash
cd agent && PATH="$NVM_BIN:$PATH" pnpm recon:demo
```

Result: pass.

Evidence:

```text
attested fills: 4   venue fills: 3   matched: 3
[! fabricated] attested fill 0xFAKE (BTC, notional 80000) has no matching fill in the deepbook record
VERDICT: DISCREPANCIES  (disputable: true)
```

This proves the deterministic catch-the-liar path for an authoritative DeepBook-style source.

### Sui Smoke

```bash
cd agent && PATH="$NVM_BIN:$PATH" pnpm smoke
```

Result: pass.

Evidence:

```text
rpc: https://fullnode.testnet.sui.io:443
network: testnet
chainId: 4c78adac
latest checkpoint: 347631856
reference gas price: 1000
smoke: all checks passed
```

### Settlement Verifier, No Package Env

```bash
cd agent && PATH="$NVM_BIN:$PATH" pnpm exec tsx src/recon/verify.ts
```

Result: expected failure without deployment env.

```text
verify failed
err: Set OATHKEEPER_PACKAGE_ID in agent/.env
```

The worktree has no `agent/.env`. The frontend snapshot contains the testnet package id used for the known proof:

```text
0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9
```

### Settlement Verifier, Known Oath

```bash
cd agent && PATH="$NVM_BIN:$PATH" \
  OATHKEEPER_PACKAGE_ID=0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9 \
  pnpm exec tsx src/recon/verify.ts \
  0x62b1c6f45f308549d93ec9462ae511135e6e89b9a766f9d4381f6f003ff8b3a3
```

Result: pass.

On-chain proof:

- Oath: `0x62b1c6f45f308549d93ec9462ae511135e6e89b9a766f9d4381f6f003ff8b3a3`
- Settlement tx: `AfAwCnrkMR8e46rhWgho3TjHKaRfVPFpbt521X43sCkz`
- Explorer: `https://suiscan.xyz/testnet/tx/AfAwCnrkMR8e46rhWgho3TjHKaRfVPFpbt521X43sCkz`
- Outcome: `KEPT`

Arithmetic re-derived from chain:

```text
bond=10000
client_claim=5000
believer=2000
doubter=1500
sum_in=13500

bond_to_promiser          on-chain=10000  re-derived=10000
bond_to_client            on-chain=0      re-derived=0
bond_residual_to_platform on-chain=0      re-derived=0
loser_to_platform         on-chain=150    re-derived=150
loser_to_secondary        on-chain=300    re-derived=300
loser_to_winners          on-chain=1050   re-derived=1050

settle event outflow=11500
winners own stakes returned via claim_payout=2000
sum_out=13500
delta=0
winner claims paid=3050
expected winner pool=3050
```

Verdict:

```text
VERIFIED - distribution matches the protocol rules and conserves to zero.
```

### Live Reconcile, Known Oath

```bash
cd agent && PATH="$NVM_BIN:$PATH" \
  OATHKEEPER_PACKAGE_ID=0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9 \
  pnpm reconcile \
  0x62b1c6f45f308549d93ec9462ae511135e6e89b9a766f9d4381f6f003ff8b3a3
```

Result: pass, with honest unverifiable verdict.

Evidence:

```text
venue=hyperliquid  source=hyperliquid  authoritative=false
attested fills: 10   venue fills: 0   matched: 0   disputable=false
VERDICT: ? UNVERIFIABLE - no authoritative source for hyperliquid.
[. unverified] attested fill 0xdeadbeef:0 ...
...
[. unverified] attested fill 0xdeadbeef:9 ...
```

This settled oath is useful for settlement arithmetic proof, but it is not a DeepBook authoritative reconciliation proof because the oath venue is Hyperliquid and no authoritative Hyperliquid adapter is wired.

## Mainnet/Demo Missing Pieces

1. Real indexer service: replace `agent/src/indexer/index.ts` skeleton with a resumable per-event cursor, per-oath state machine, persisted local store, and deterministic calls into `reconcile()`.
2. DeepBook authoritative demo oath: create a testnet/mainnet oath with venue `deepbook` and real DeepBook fill references so `pnpm reconcile <oath>` can produce a live authoritative `clean` or `discrepancies` verdict from chain data.
3. DeepBook fill-level indexing hardening: use the `DeepBookOrderFilledVenueSource`/`fillsFromOrderFilled` path for notional-level checks, configure package id and balance manager id, and document current package/version assumptions.
4. Dispute service path: wire substantiated `fabricated`/`mismatch` findings to `dispute_attestation` in an operator-safe workflow with explicit dry-run output and no secret printing.
5. Runtime setup: add a repo-local Node version pin or setup note so `pnpm test` does not accidentally run under Node 18 on this machine.
6. Beads availability: install or document `bd` setup; this worktree cannot satisfy issue status updates until the CLI exists.

## Bottom Line

The repo has judge-verifiable deterministic proof scripts today: unit-tested reconciliation logic, a fabricated-fill demo, Sui RPC smoke check, and a read-only settlement verifier that confirms the known oath conserves exactly to zero on testnet.

It does not yet have a production-grade always-on indexer. For mainnet/demo, the remaining work is to turn the skeleton into a durable event processor and produce at least one live DeepBook venue oath whose reconciliation verdict is authoritative, not merely fixture-based or Hyperliquid-unverifiable.
