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
- `DEEPBOOK_PACKAGE_ID`
- `DEEPBOOK_BALANCE_MANAGER_ID`
- `DEEPBOOK_TRADE_CAP_ID`
- `DEEPBOOK_DEPOSIT_CAP_ID`
- `DEEPBOOK_WITHDRAW_CAP_ID`
- `SUI_DBUSDC_POOL_ID`
- `DBUSDC_TYPE`

## Current Blockers

- Local toolchain is `sui 1.60.0-homebrew`; DeepBook v3 package resolution needs a newer Sui CLI, so the harness fails before spending gas until upgraded.
- The witnessed BalanceManager swap path still requires DEEP fee funding. The direct no-DEEP/input-fee DeepBook route does not apply to the current BalanceManager-anchored design.
- U1 progress is tracked in `docs/research/deepbook-u1-live-swap-research.md`, this execution note, and `.beads/issues.jsonl`.
