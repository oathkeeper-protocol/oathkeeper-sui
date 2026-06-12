# Backend U1 Orca Audit Report

Date: 2026-06-12
Branch: `amrrobb/backend-u1-codex`
Scope: `agent/src/**`, `agent/.env.example`, `docs/plans/EXEC-backend-u1-orca.md`

## Verdict

The integrated U1 live witnessed DeepBook harness is correctly gated from current
HEAD. With local `sui 1.60.0-homebrew`, `agent/src/sui/live-witnessed-swap.ts`
fails before loading signer keys into PTBs, before constructing live transactions,
and before spending gas:

```text
Sui CLI sui 1.60.0-homebrew is too old for current DeepBook v3 package resolution; upgrade to >=1.69.x and rerun
```

No source or env-example fail-fast patch was needed during this audit.

## Checks Run

Run from `/Users/ammar.robb/orca/workspaces/managua/backend-u1-codex`.

```bash
pwd
git branch --show-current
sui --version
```

Results:

- Workspace: `/Users/ammar.robb/orca/workspaces/managua/backend-u1-codex`
- Branch: `amrrobb/backend-u1-codex`
- Sui CLI: `sui 1.60.0-homebrew`

Agent verification:

```bash
cd agent
corepack pnpm install --frozen-lockfile
corepack pnpm install --frozen-lockfile --force
/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin/node ./node_modules/typescript/bin/tsc --noEmit
/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin/node ./node_modules/vitest/vitest.mjs run --passWithNoTests
/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin/node ./node_modules/tsx/dist/cli.mjs src/sui/live-witnessed-swap.ts full
```

Results:

- TypeScript typecheck: passed.
- Vitest: passed, 3 files / 14 tests.
- Live harness: failed fast at the old-Sui-CLI gate before any gas path.

Node 24 was requested if available, but this workspace only exposed Node
`v23.3.0` through the active NVM path. The Homebrew `pnpm` shim reported Node
`v18.16.1`, so checks were run through the explicit Node `v23.3.0` binary.

## Audit Notes

- `agent/.env.example` contains the current DeepBook v19 package, registry,
  DEEP, DBUSDC, DEEP/SUI pool, and SUI/DBUSDC pool defaults needed for U1.
- `LIVE_WITNESSED_MODE=full` and `bootstrap-manager` both pass through
  `checkSuiCli()` before signer loading or PTB execution.
- The harness error message is specific enough for the current blocker and does
  not print secrets.
- `bd onboard` could not be run because `bd` is not installed on PATH.
- `.context/CODEX-HANDOFF.md` was requested but is absent in this worktree.

## Remaining Blockers

- Human must upgrade Sui CLI to a DeepBook-compatible version. Do not run
  `brew upgrade sui` from an agent session.
- Live U1 still needs funded testnet wallets, a shared BalanceManager, caps, and
  DEEP fee funding before any gas-spending swap.
- Re-run `cd contracts && sui move build --test` after the Sui CLI upgrade and
  before any live swap.
