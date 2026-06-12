---
title: "DeepBook U1 Orca follow-up"
date: 2026-06-12
status: verified
scope: docs-only follow-up to integrated U1 memo
---

# DeepBook U1 Orca Follow-up

## Verdict

No checked DeepBook U1 integration fact has changed since
`docs/research/deepbook-u1-live-swap-research.md`.

The integrated memo's core conclusion still holds: use the current testnet package
ID `0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8`, keep the
original package ID `0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982`
for object type origins, use the existing registry and pool IDs below, and assume
DEEP fee funding is required for Oathkeeper's BalanceManager-backed witnessed swap
path.

Confidence: high for package IDs, object IDs, BalanceManager public APIs, and the
DEEP/no-DEEP fee verdict. Medium for the cap-bundle helper name because current
GitHub source and deployed testnet bytecode remain out of sync there.

## Checked Facts

| Fact | Current result | Changed? | Evidence |
| --- | --- | --- | --- |
| Current DeepBook testnet package ID | `0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8` | No | GitHub `Published.toml`; testnet object lookup reports package version `19`. |
| Previous package ID | `0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c` | No | Testnet object lookup still reports package version `17`, not latest. |
| Original package ID / object type origin | `0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982` | No | GitHub `Published.toml`; registry and pool object types are still under `0xfb28...`. |
| Registry object | `0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1` | No | Testnet object type remains `0xfb28...::registry::Registry`, shared. |
| DEEP/SUI pool | `0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f` | No | Testnet object type remains `0xfb28...::pool::Pool<DEEP, SUI>`, shared. |
| SUI/DBUSDC pool | `0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5` | No | Testnet object type remains `0xfb28...::pool::Pool<SUI, DBUSDC>`, shared. |
| BalanceManager cap APIs | Owner-minted `mint_trade_cap`, `mint_deposit_cap`, `mint_withdraw_cap` still exist; source-level authorized bundle is `new_with_custom_owner_caps_v2` | No, with same deployed/source nuance | Current source has `_v2`; package-version-19 bytecode still exposes `new_with_custom_owner_caps<App>`. |
| DEEP/no-DEEP fee verdict | Manager swaps require DEEP fee funding; direct non-manager swaps can use the input-fee/no-DEEP branch, but that does not satisfy the witnessed BalanceManager design | No | Current `pool.move` source still says manager swap wrappers assume DEEP and enough manager DEEP; SDK docs still separate direct swaps with `deepAmount` from manager swaps without a no-DEEP parameter. |

## Source Notes

- Current DeepBook `Published.toml` on GitHub still says testnet is package version
  `19`, published at `0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8`,
  with original ID `0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982`
  and toolchain `1.69.2`.
- Current `balance_manager.move` still exposes immutable `balance<T>(&BalanceManager):
  u64`, owner creation, custom owner creation, separate owner-only cap minting, cap
  deposit/withdraw, owner/trader proof generation, and `register_balance_manager`.
- Current source-level `new_with_custom_owner_caps_v2<App: drop>(witness, &Registry,
  owner, ctx)` still differs from deployed package-version-19 bytecode, where the
  disassembly visible through the local `sui 1.60.0-homebrew` client still shows
  `new_with_custom_owner_caps<App>(&Registry, owner, ctx)`. Keep the memo's safer
  U1 route: create/share a plain BalanceManager and mint caps separately.
- Current `pool.move` still has direct swap wrappers returning `(Coin<Base>,
  Coin<Quote>, Coin<DEEP>)` and manager wrappers returning `(Coin<Base>, Coin<Quote>)`.
  The direct path still has the input-fee/no-DEEP branch; the manager wrapper comments
  still assume DEEP fees and enough DEEP in the BalanceManager. The implementation
  path still calls market-order logic with `pay_with_deep = true`.
- The Sui docs SDK page still says the SDK constants file tracks latest deployed
  addresses, and the SDK docs still list default testnet coins `DEEP`, `SUI`,
  `DBUSDC`, and `DBUSDT`.
- The Sui docs BalanceManager page still lists create/share, deposit/withdraw,
  proof generation, cap minting, cap deposit/withdraw, and registration functions.
- The Sui docs swap page still separates direct `swapExactQuantity` parameters
  including `deepAmount` from `swapExactQuantityWithManager` parameters requiring
  BalanceManager/cap inputs and no `deepAmount` parameter.

## Commands Run

```bash
pwd
git branch --show-current
bd onboard
find .. -path '*/.context/CODEX-HANDOFF.md' -print
find . -maxdepth 3 -type f | sort | rg '(^|/)\\.context/|HANDOFF|handoff|deepbook'
sui --version
sui client active-env
sui client object 0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8 --json
sui client object 0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c --json
sui client object 0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1 --json
sui client object 0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f --json
sui client object 0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5 --json
```

## Sources

- DeepBook `Published.toml`:
  https://raw.githubusercontent.com/MystenLabs/deepbookv3/main/packages/deepbook/Published.toml
- DeepBook `balance_manager.move`:
  https://raw.githubusercontent.com/MystenLabs/deepbookv3/main/packages/deepbook/sources/balance_manager.move
- DeepBook `pool.move`:
  https://raw.githubusercontent.com/MystenLabs/deepbookv3/main/packages/deepbook/sources/pool.move
- Sui DeepBookV3 SDK docs:
  https://docs.sui.io/onchain-finance/deepbookv3-sdk/
- Sui BalanceManager SDK docs:
  https://docs.sui.io/onchain-finance/deepbookv3-sdk/balance-manager
- Sui Swaps SDK docs:
  https://docs.sui.io/onchain-finance/deepbookv3-sdk/swaps

## Blockers / Local Setup Notes

- `.context/CODEX-HANDOFF.md` was requested but is absent in this workspace and under
  `..`; no handoff file was available to read.
- `bd onboard` could not run because `bd` is not installed in PATH.
- Local Sui remains `sui 1.60.0-homebrew`; testnet fullnode reports server API
  `1.73.1`. Per guardrail, this follow-up did not run `brew upgrade sui`.
