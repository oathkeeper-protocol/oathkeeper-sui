# Overnight Smart-Contract Proof

Date: 2026-06-13
Worker: smart-contract/testnet proof

## Scope

Prove the Oathkeeper smart-contract side as far as this machine and current
testnet constraints allow, without spending gas. Reviewed:

- `contracts/Move.toml`
- `contracts/sources/*.move`
- `contracts/tests/*.move`
- `scripts/redeploy.sh`
- `docs/plans/EXEC-backend-live-swap.md`
- `docs/research/deepbook-u1-live-swap-research.md`

`.context/` is absent in this child worktree, so this report uses the dispatch
spec plus `STRATEGY.md` and `CLAUDE.md` as ground truth.

## Command Evidence

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Worktree orientation | `pwd`, `git branch --show-current`, `git status --short` | Pass | Worktree: `/Users/ammar.robb/orca/workspaces/managua/overnight-sc-proof-codex`; branch: `amrrobb/overnight-sc-proof-codex`; initial short status was clean. |
| Beads onboarding | `bd onboard` | Blocked | `zsh:1: command not found: bd`; Beads CLI is not installed in this environment. |
| Sui CLI version | `sui --version` | Pass | `sui 1.60.0-homebrew`. |
| Sui network state | `sui client active-env && sui client envs` | Read-only pass with warning | Active env is `testnet`; CLI warns client API `1.60.0` vs server API `1.73.1`. |
| Contract build | `cd contracts && sui move build` | Pass | Package builds. The CLI warns that `[dep-replacements]` is an unknown field, then includes `deepbook`, `token`, `Bridge`, `SuiSystem`, `Sui`, and `MoveStdlib`. Only warnings are lint/deprecation warnings in local modules. |
| Contract tests | `cd contracts && sui move test` | Fail before local tests run | Compilation fails in DeepBook dependency tests because `std::unit_test::destroy` is unavailable in the installed CLI stdlib. First failure: `deepbook/tests/balance_manager_tests.move:18:21 use std::unit_test::destroy`. |
| Test-mode compile | `cd contracts && sui move build --test` | Fail before local tests run | Same DeepBook dependency-test failure on `std::unit_test::destroy`. |
| Publish dry-run | `cd contracts && sui client publish --dry-run --gas-budget 300000000 --json` | Fail before execution; no gas spent | CLI warns protocol/API mismatch and ignores `[dep-replacements]`, then fails: `Package dependency "deepbook" does not specify a published address`. |

## Contract Findings

No small Oathkeeper contract or local test bug was isolated in this pass.
The source build passes with the installed compiler, including the DeepBook
source dependency in normal build mode. The failing commands do not reach
Oathkeeper's local tests; they fail while compiling DeepBook's own dependency
tests or while resolving DeepBook's published address for a dry-run publish.

The package currently contains 59 local Move tests across `contracts/sources`
and `contracts/tests`, including witnessed-tier coverage for:

- WITNESSED mint carrying the chain balance anchor.
- SELF_REPORTED mint retaining the existing default tier.
- `record_trade` rejection on WITNESSED oaths.
- Kept and Broken witnessed settlement paths.
- Low-water-mark drawdown breach.
- Self-reported settlement rejection for WITNESSED oaths.
- Dead-operator/min-trades breach.
- Final settlement anchor drawdown breach.

Those tests could not be proven on this machine because the test compiler fails
inside the DeepBook dependency before local tests execute.

## Blocker Classification

Classification: **local Sui CLI / DeepBook dependency state, not a proven
Oathkeeper code blocker**.

Specific blockers:

1. The installed CLI is `sui 1.60.0-homebrew`, while testnet reports server API
   `1.73.1` and protocol skew during publish dry-run.
2. `contracts/Move.toml` uses `[dep-replacements.testnet]`, but this CLI treats
   `dep-replacements` as an unknown field. As a result, publish dry-run cannot
   see DeepBook's testnet `published-at` / `original-id` mapping.
3. `sui move test` and `sui move build --test` compile DeepBook dependency tests
   from GitHub `main`; those tests require `std::unit_test::destroy`, absent in
   the installed CLI's stdlib.
4. The live witnessed DeepBook flow remains additionally gated by explicit live
   object and funding state: BalanceManager, TradeCap, DepositCap, WithdrawCap,
   SUI/DBUSDC pool inputs, and DEEP fee funding.

The existing repo docs already align with this classification:

- `docs/plans/EXEC-backend-live-swap.md` says the live harness is intentionally
  gated until the local Sui CLI is upgraded from 1.60.x and live object IDs /
  funded wallets are present.
- `docs/research/deepbook-u1-live-swap-research.md` records DeepBook testnet
  package version 19 at
  `0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8` and
  notes the local CLI/testnet skew.

## Next Command After Sui CLI Upgrade

Do not spend gas first. After upgrading the Sui CLI, re-run dependency and
testnet mapping proof:

```bash
sui --version
sui client active-env
sui client object 0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8 --json
cd contracts
sui move build
sui move build --test
sui move test
sui client publish --dry-run --gas-budget 300000000 --json
```

If all of those pass, the next live step is the existing harness path in
`docs/plans/EXEC-backend-live-swap.md`:

```bash
cd agent
pnpm live:witnessed bootstrap-manager
pnpm live:witnessed full
```

That live path should only run once the deployer/exec keys, DeepBook object IDs,
BalanceManager caps, SUI/DBUSDC pool inputs, and DEEP fee funding are in place.
