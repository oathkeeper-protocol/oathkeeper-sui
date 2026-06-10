# Reconciliation — the open-source, deterministic verifier

This is the layer that makes Oathkeeper's "verifiable opacity" true at the attestation level.

## The gap it closes

`attestation::record_trade` is gated to the bound exec wallet but accepts the operator's
**self-reported** equity / volume / fill numbers. Settlement enforces the SLA dimensions
against those numbers. So on its own, the contract proves the *math*, but *trusts the
inputs*. A dishonest operator could attest fills that never happened.

The reconciler independently re-derives the truth from the **venue's own fill record** and
diffs it against what the operator attested on-chain. Because it is **pure and
deterministic** (`reconcile.ts` has no I/O), anyone can re-run it on public data and get the
identical verdict — a discrepancy is a *proof*, not an opinion.

## Trust boundary (stated honestly)

| | Status |
|---|---|
| **Detection** of a fabricated/altered fill | **trustless + deterministic** for on-chain venues (DeepBook) |
| **Enforcement** (auto-slash the bond on a proven fabrication) | bonded-optimistic dispute layer — **roadmap**, see `contracts/sources/attestation.move` |

The reconciler files an on-chain `dispute_attestation` for each substantiated finding. The
dispute is permanently recorded; turning it into automatic slashing requires the
optimistic challenge-window protocol described in `docs/ARCHITECTURE.md`.

## Where the ground truth lives (venue → source)

- **DeepBook (venue 0, on Sui):** the chain holds every fill → `DeepBookVenueSource` is
  authoritative. *This is the trustless case.* (v1 = digest-existence proof; notional-level
  cross-check by parsing DeepBook fill events is the next refinement.)
- **Hyperliquid (venue 1, another chain):** Sui can't read it → `UnverifiableVenueSource`,
  verdict `unverifiable`. Needs the HL API or a Nautilus/zkTLS attestation (roadmap).
- **Fixture:** a deterministic authoritative record for tests + demos → `FixtureVenueSource`.

## Usage

```bash
# verify against the bound venue (DeepBook reads Sui; set DEEPBOOK_PACKAGE_ID to enable)
pnpm reconcile <oathId>

# deterministic demo: diff against a fixture venue record
pnpm reconcile <oathId> --fixture report.json

# file on-chain disputes for any unbacked fills (needs OATHKEEPER_DEPLOYER_KEY + gas)
pnpm reconcile <oathId> --dispute
```

Exit code `2` = discrepancies found (useful in CI / scripts). Fixture JSON shape:

```json
[{ "venueTxHash": "0xaa", "asset": "BTC", "notional": "1000", "timestampMs": 1 }]
```

Note: the seeded demo oaths use venue=1 (Hyperliquid pass-through) and self-reported
attestations, so live reconciliation honestly reports them as `unverifiable`. The vitest
fixtures in `reconcile.test.ts` prove the catch-the-liar logic deterministically.
