---
title: "EXEC: UI/UX witnessed DeepBook clarity"
type: exec
status: implemented
date: 2026-06-12
---

# UI/UX Witnessed DeepBook Clarity

## What changed

- Added a shared `TierBadge` so browse cards and oath detail show `WITNESSED` vs `SELF_REPORTED` with protocol-aligned labels.
- Reworked the oath detail verification panel to separate the trust model by dimension:
  - drawdown survival is the WITNESSED trustless claim, anchored by DeepBook `BalanceManager::balance()`;
  - trades and volume are routed/witnessed but not wash-proof;
  - reconciliation remains deterministic and non-gating.
- Updated settlement preview copy so judges see the final data source before money flow: WITNESSED uses a final BalanceManager anchor; SELF_REPORTED uses reported oath fields.
- Guarded the action bar from submitting the legacy `settle_epoch` PTB for WITNESSED oaths when no `balanceManagerId` is available in the frontend model.
- Clarified the mint page: browser mint currently creates SELF_REPORTED oaths; WITNESSED DeepBook mint/settle needs the capture-at-execution path and bound BalanceManager anchor.
- 2026-06-12 audit pass: removed residual market-comparison wording and replaced remaining judge-facing legacy vocabulary with oath/commitment language.

## Remaining work

- Expose the bound BalanceManager object id for WITNESSED oaths in the on-chain object, event stream, or snapshot pipeline.
- Add a browser PTB builder for the anchor-aware WITNESSED settle entry once the final Move function signature and object ids are deployed.
- Seed at least one live WITNESSED oath so the badge and action-bar state can be visually verified against real data, not just defensive fields.
- `bd` was not available on PATH in this worker environment, so issue status could not be updated from the CLI.

## Verification

- Frontend lint/build were run from `frontend/` for this worker change.
