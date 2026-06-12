# Overnight Backend Live Harness Proof

Date: 2026-06-13

## Result

Backend and live-harness readiness is proven as far as this worktree can safely go without a Sui CLI upgrade and live funded signing material. The witnessed DeepBook script now validates the full-mode object IDs and all required signer env vars before loading keys, signing the witnessed binding, building PTBs, or submitting any gas-spending transaction. The local live run stops at the expected Sui CLI gate:

```text
Sui CLI sui 1.60.0-homebrew is too old for current DeepBook v3 package resolution; upgrade to >=1.69.x and rerun
```

## Harness Path Audited

The intended path in `agent/src/sui/live-witnessed-swap.ts` is:

1. `bootstrap-manager`: create/share a DeepBook `BalanceManager`, mint `DepositCap`, `WithdrawCap`, and `TradeCap`, then print only public object IDs to place in env.
2. `full`: mint a witnessed oath with an ed25519 exec-wallet binding signature.
3. Trade through `witnessed::trade_via_deepbook` using the BalanceManager anchor and cap objects.
4. Wait until epoch end and settle through `witnessed::settle_epoch_witnessed`.

The PTB helpers in `agent/src/sui/ptb.ts` route the witnessed path through:

- `witnessed::mint_witnessed<T>`
- `witnessed::trade_via_deepbook<Base, Quote>`
- `witnessed::settle_epoch_witnessed<T>`

## Signer Safety

No private keys were printed, copied, or committed. The script reads keys only from env and logs public addresses, scope hash, transaction digests, and object IDs.

Patch applied:

- `full` mode now validates `OATHKEEPER_PACKAGE_ID`, `OATHKEEPER_REGISTRY_ID`, `DEEPBOOK_BALANCE_MANAGER_ID`, `DEEPBOOK_TRADE_CAP_ID`, `DEEPBOOK_DEPOSIT_CAP_ID`, `DEEPBOOK_WITHDRAW_CAP_ID`, `SUI_DBUSDC_POOL_ID`, `OATHKEEPER_PROMISER_KEY`, `OATHKEEPER_EXEC_KEY`, and `OATHKEEPER_DEPLOYER_KEY` before any key parsing or transaction submission.
- The deployer signer is loaded once up front and reused for settlement, preventing a late missing-key failure after mint/trade gas has already been spent.
- `agent/.env.example` now includes the missing `OATHKEEPER_DEPLOYER_KEY` template entry.

## Commands Run

```text
sui --version
```

Result: `sui 1.60.0-homebrew`.

```text
cd agent && pnpm typecheck
```

Result: passed after `pnpm install --frozen-lockfile`; pnpm still warns that its current runtime is Node `v18.16.1` while `package.json` requires Node `>=20`.

```text
cd agent && pnpm test
```

Result in default shell: failed before tests because pnpm ran under Node `v18.16.1`; Vitest/Rolldown needs newer Node APIs. Rerun with Node 23 on PATH:

```text
cd agent && PATH=/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin:$PATH pnpm test
```

Result: passed, 3 test files, 14 tests.

```text
cd agent && pnpm smoke
```

Result in default shell: failed before Sui RPC because pino needs newer Node APIs than Node `v18.16.1`. Rerun with Node 23 on PATH:

```text
cd agent && PATH=/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin:$PATH pnpm smoke
```

Result: passed against testnet RPC, chain id `4c78adac`, latest checkpoint observed `347631849`, reference gas price `1000`.

```text
cd agent && pnpm live:witnessed
cd agent && PATH=/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin:$PATH pnpm live:witnessed
```

Result: both fail before gas at the Sui CLI version gate because local CLI is `sui 1.60.0-homebrew`.

## Residual Blockers

- Upgrade local Sui CLI to at least `1.69.x`; do not use `brew upgrade sui` in this worktree/session.
- Run the agent scripts with Node `>=20`; this shell's direct `pnpm` execution reports Node `v18.16.1`, while Node `v23.3.0` is available at `/Users/ammar.robb/.nvm/versions/node/v23.3.0/bin`.
- Provide live testnet env values for the Oathkeeper package, registry, BalanceManager and cap object IDs.
- Fund the promiser, exec, and deployer wallets with testnet gas and required coin balances.
- Fund the DeepBook BalanceManager path with DEEP fee liquidity as required by the current BalanceManager-anchored design.

## Post-Upgrade Commands

From `agent/`, with Node `>=20` on PATH and live env set:

```bash
sui --version
pnpm typecheck
pnpm test
pnpm smoke
pnpm live:witnessed bootstrap-manager
pnpm live:witnessed full
```

If the BalanceManager already exists and caps are already in env, skip `bootstrap-manager` and run:

```bash
pnpm live:witnessed full
```
