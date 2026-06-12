---
title: "EXEC: overnight UI/UX proof polish"
type: exec
status: implemented
date: 2026-06-13
---

# Overnight UI/UX Proof Polish

## Judge-ready now

- The app and landing page consistently frame Oathkeeper as a DeFi & Payments commitment market: Oathkeeper, Oath, Doubter, Bond, Stake, Keep/Break.
- Oath detail separates WITNESSED from SELF_REPORTED proof:
  - WITNESSED drawdown survival is the trustless claim, anchored by DeepBook BalanceManager `balance()` reads.
  - SELF_REPORTED oaths settle on-chain from submitted fields, with reconciliation as a non-gating dispute signal.
  - Trades and volume are disclosed as witnessed/reconciled where applicable, not blanket wash-proof guarantees.
- The landing page now avoids the parent snapshot copy collisions around `fails`, `<=20%`, and `10 trades`; compact terms are kept as intact UI atoms.
- Browser mint is labeled as a SELF_REPORTED testnet path. WITNESSED DeepBook mint/settle is correctly described as the separate capture-at-execution path.

## Still needs live IDs/assets

- Bound `BalanceManager` object ids need to be exposed in the on-chain object, event stream, or snapshot pipeline for WITNESSED oaths.
- The frontend still needs the anchor-aware WITNESSED settle PTB once the final Move signature and object ids are deployed.
- Live WITNESSED sample data should be seeded so judges can inspect a real testnet oath instead of defensive UI copy.
- Walrus/Seal should not be claimed as live encrypted blob storage until the UI can show a real blob id/read path and access-policy artifact.
- Hyperliquid should remain roadmap/pass-through language until there is a real cross-chain execution or binding proof in the demo.

## Verification

- Required frontend checks were run from `frontend/` after the UI changes:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
