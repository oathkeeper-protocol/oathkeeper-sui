# Backend Live Witnessed Swap Harness

Status: near-runnable; live execution is intentionally gated until the local Sui CLI is upgraded from 1.60.x and live object IDs/funded wallets are present.

## Script

From `agent/`:

```bash
pnpm live:witnessed bootstrap-manager
pnpm live:witnessed full
```

The script:

- Creates and shares a DeepBook `BalanceManager`, mints `TradeCap`, `DepositCap`, and `WithdrawCap`, and logs the object IDs.
- Signs the DeepBook exec-wallet binding preimage with `OATHKEEPER_EXEC_KEY`.
- Mints a witnessed oath through `witnessed::mint_witnessed`.
- Trades via `witnessed::trade_via_deepbook`.
- Settles through `witnessed::settle_epoch_witnessed` after the epoch closes.

## Required Environment

Use `agent/.env.example` as the source of truth. The live path needs:

- `OATHKEEPER_PACKAGE_ID`
- `OATHKEEPER_REGISTRY_ID`
- `OATHKEEPER_PROMISER_KEY`
- `OATHKEEPER_EXEC_KEY`
- `OATHKEEPER_DEPLOYER_KEY`
- `DEEPBOOK_BALANCE_MANAGER_ID`
- `DEEPBOOK_TRADE_CAP_ID`
- `DEEPBOOK_DEPOSIT_CAP_ID`
- `DEEPBOOK_WITHDRAW_CAP_ID`
- `SUI_DBUSDC_POOL_ID`
- `DBUSDC_TYPE`

## Current Blockers

- Local toolchain is `sui 1.60.0-homebrew`; DeepBook v3 package resolution needs a newer Sui CLI, so the harness fails before spending gas until upgraded.
- The repo worktree did not include `.context/CODEX-HANDOFF.md`; this doc captures the executable handoff state for this worker.
- `bd` is not installed on PATH, so bead status updates could not be performed from this worktree.
