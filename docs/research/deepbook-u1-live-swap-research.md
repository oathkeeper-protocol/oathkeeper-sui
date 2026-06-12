---
title: "DeepBook U1 live-swap research"
date: 2026-06-12
status: verified
scope: docs-only research memo
---

# DeepBook U1 Live-Swap Research

## Verdict

U1 should proceed only after upgrading the local Sui CLI. The local client is
`sui 1.60.0-homebrew`, while testnet fullnode reports server API `1.73.1`; read-only
object lookups work, but this is exactly the mismatch already blocking newer
DeepBook dependency/test behavior.

The handoff claim that `0xfb28c4cb...` is dead and latest is `0x22be4c...` is only
half right:

- `0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982` is the
  original package ID. It is not "dead" as a type address: current shared objects
  are still typed under it.
- `0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c` exists on
  testnet as a DeepBook package object, but chain lookup shows it at package
  version 17.
- The current local DeepBook `Published.toml` from `MystenLabs/deepbookv3` says
  testnet version 19 is published at
  `0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8`, original
  ID `0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982`,
  toolchain `1.69.2`.
- Testnet fullnode confirms `0x74cd565...` exists as package version 19.

Confidence: high for package/object constants and DEEP requirements; medium for
the exact cap-creation helper name to use in a PTB because GitHub `main` source is
ahead of the currently deployed testnet bytecode in at least one BalanceManager
helper name.

## Sources Checked

Primary/current sources:

- Sui docs DeepBookV3 overview: https://docs.sui.io/onchain-finance/deepbookv3/deepbook
- Sui docs DeepBookV3 SDK: https://docs.sui.io/onchain-finance/deepbookv3-sdk
- Sui docs BalanceManager SDK: https://docs.sui.io/onchain-finance/deepbookv3-sdk/balance-manager
- Sui docs Swaps SDK: https://docs.sui.io/onchain-finance/deepbookv3-sdk/swaps
- DeepBook source:
  - `~/.move/https___github_com_MystenLabs_deepbookv3_git_main/packages/deepbook/Published.toml`
  - `~/.move/https___github_com_MystenLabs_deepbookv3_git_main/packages/deepbook/sources/balance_manager.move`
  - `~/.move/https___github_com_MystenLabs_deepbookv3_git_main/packages/deepbook/sources/pool.move`
  - `~/.move/https___github_com_MystenLabs_deepbookv3_git_main/packages/deepbook/sources/vault/deep_price.move`
  - `~/.move/https___github_com_MystenLabs_deepbookv3_git_main/packages/deepbook/sources/state/governance.move`
- Testnet fullnode object reads with `sui client object ... --json`.

Useful commands run:

```bash
sui --version
sui client active-env
sui client object 0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c --json
sui client object 0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8 --json
sui client object 0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982 --json
sui client object 0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1 --json
sui client object 0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb --json
sui client object 0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f --json
sui client object 0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5 --json
```

## Verified Constants

### Package and Token

| Name | Value | Evidence |
| --- | --- | --- |
| DeepBook original package ID | `0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982` | `Published.toml` original ID; object types for Registry and Pools |
| DeepBook package version 17 | `0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c` | testnet object lookup: type `package`, version `17` |
| DeepBook package version 19 | `0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8` | `Published.toml`; testnet object lookup: type `package`, version `19` |
| DEEP package | `0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8` | local config and pool object types |
| DEEP type | `0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP` | local config and pool object types |
| DEEP treasury | `0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb` | testnet object type `...::deep::ProtectedTreasury` |
| DBUSDC type | `0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC` | SUI/DBUSDC pool object type |

### Shared Objects

| Name | Value | Evidence |
| --- | --- | --- |
| DeepBook Registry | `0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1` | testnet object type `0xfb28...::registry::Registry`, shared |
| DEEP/SUI pool | `0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f` | testnet object type `0xfb28...::pool::Pool<DEEP, SUI>`, shared |
| SUI/DBUSDC pool | `0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5` | testnet object type `0xfb28...::pool::Pool<SUI, DBUSDC>`, shared |
| Clock | `0x6` | Sui framework convention and local PTB builder |

### Repo Constants Updated During Integration

The coordinator integration updated `contracts/Move.toml`, `agent/src/sui/client.ts`,
and `agent/.env.example` to use `DEEPBOOK_PACKAGE_ID=0x74cd565...` for U1. The
contract dependency replacement also records the DeepBook original ID as
`0xfb28c4cb...`, matching the shared object type origins. Reconfirm compilation after
the Sui CLI upgrade before spending gas.

## BalanceManager and Cap APIs

Source-level current API in `balance_manager.move`:

- `balance<T>(&BalanceManager): u64`: immutable balance read, returns zero if no
  balance for `T`.
- `new(ctx): BalanceManager`: creates an unshared manager owned by `ctx.sender()`.
- `new_with_custom_owner(owner, ctx): BalanceManager`.
- `new_with_custom_owner_caps_v2<App: drop>(witness, &Registry, owner, ctx):
  (BalanceManager, DepositCap, WithdrawCap, TradeCap)`: protected by app
  authorization in the Registry.
- `mint_trade_cap(&mut BalanceManager, ctx): TradeCap`, owner-only.
- `mint_deposit_cap(&mut BalanceManager, ctx): DepositCap`, owner-only.
- `mint_withdraw_cap(&mut BalanceManager, ctx): WithdrawCap`, owner-only.
- `generate_proof_as_owner(&mut BalanceManager, &TxContext): TradeProof`.
- `generate_proof_as_trader(&mut BalanceManager, &TradeCap, &TxContext): TradeProof`.
- `deposit<T>(&mut BalanceManager, Coin<T>, ctx)`, owner-only direct deposit.
- `deposit_with_cap<T>(&mut BalanceManager, &DepositCap, Coin<T>, &TxContext)`.
- `withdraw_with_cap<T>(&mut BalanceManager, &WithdrawCap, amount, ctx): Coin<T>`.
- `register_balance_manager(&BalanceManager, &mut Registry, ctx)`, owner-only.

Deployment nuance: testnet object disassembly for package version 19 still showed
`new_with_custom_owner_caps<App>` rather than the source-level
`new_with_custom_owner_caps_v2<App>`. The safer U1 path is:

1. Create/share a plain BalanceManager with the SDK call
   `createAndShareBalanceManager`, or with Move `new` followed by `transfer::share_object`
   in a tiny helper package if needed.
2. Mint `TradeCap`, `DepositCap`, and `WithdrawCap` separately as the BalanceManager
   owner.
3. Deposit SUI/DBUSDC and DEEP into the manager.

This avoids relying on the app-authorization cap bundle path until the deployed
bytecode/source mismatch is resolved.

## Swap APIs and DEEP Requirement

Relevant source-level swap functions:

- Direct swap without manager:
  - `swap_exact_base_for_quote<Base, Quote>(&mut Pool, Coin<Base>, Coin<DEEP>, min_quote_out, &Clock, ctx): (Coin<Base>, Coin<Quote>, Coin<DEEP>)`
  - `swap_exact_quote_for_base<Base, Quote>(&mut Pool, Coin<Quote>, Coin<DEEP>, min_base_out, &Clock, ctx): (Coin<Base>, Coin<Quote>, Coin<DEEP>)`
- BalanceManager swap:
  - `swap_exact_base_for_quote_with_manager<Base, Quote>(&mut Pool, &mut BalanceManager, &TradeCap, &DepositCap, &WithdrawCap, Coin<Base>, min_quote_out, &Clock, ctx): (Coin<Base>, Coin<Quote>)`
  - `swap_exact_quote_for_base_with_manager<Base, Quote>(...)`
  - underlying `swap_exact_quantity_with_manager` always places a market order with `pay_with_deep = true`.

No-DEEP verdict:

- For the direct non-manager swap path, a caller can pass zero DEEP and pay an input-token fee. Source explicitly branches on `deep_in.value() > 0` and uses input-fee quote functions when false.
- For the BalanceManager `*_with_manager` path needed by Oathkeeper's witnessed U1 design, there is no no-DEEP route in the public wrapper. Source comments say fees are paid in DEEP and the manager must have enough DEEP. The implementation calls `place_market_order(..., pay_with_deep = true, ...)`.
- Whitelisted pools can make the calculated DEEP fee zero (`deep_price.move` returns no fee for whitelist), but public permissionless pools are not whitelisted by default, and the SUI/DBUSDC pool object is a normal registered pool. Oathkeeper cannot assume a whitelisted route.
- Stable/input-fee routes do not solve U1 because they apply to the direct swap path, not the BalanceManager path used to anchor equity and capabilities.

Therefore U1 live-swap requires DEEP in the BalanceManager unless the team deliberately changes the witnessed entry to use a direct swap without BalanceManager anchoring, which would undermine the current trustless equity design.

## Exact Objects Needed for the U1 PTB

For the current `oathkeeper::witnessed::trade_via_deepbook<BaseAsset, QuoteAsset>`:

- Oath object: `&mut Oath<QuoteAsset>`.
- DeepBook Pool object: `&mut Pool<BaseAsset, QuoteAsset>`.
  - For SUI -> DBUSDC: `0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5`
  - Type args:
    - Base: `0x2::sui::SUI`
    - Quote: `0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC`
- Shared BalanceManager object, funded with:
  - base input asset for the swap if using BalanceManager deposits, or supplied base `Coin<BaseAsset>` for current Oathkeeper entry
  - enough `DEEP` for fees
  - quote asset balance if minting/settling a quote-denominated oath needs a nonzero anchor
- Owned `TradeCap` for that BalanceManager.
- Owned `DepositCap` for that BalanceManager.
- Owned `WithdrawCap` for that BalanceManager.
- `Coin<BaseAsset>` input for `base_in`.
- Clock object `0x6`.
- Signer must be the Oath `exec_addr`; the witnessed entry checks this.

For `mint_witnessed<T>`:

- Oathkeeper registry object.
- Bond coin of type `T`.
- Shared BalanceManager object.
- Clock `0x6`.
- Exec wallet signature/pubkey parameters.
- Type arg `T` must match the equity denomination read by `balance<T>(&BalanceManager)`.

For `settle_epoch_witnessed<T>`:

- Oath object.
- Oathkeeper registry object.
- Shared BalanceManager object.
- Clock `0x6`.

## Risks

- **Published package mismatch:** `0x22be4c...` is not latest by chain version; use
  `0x74cd565...` for package replacement after upgrading CLI. Shared object types
  still use original ID `0xfb28...`, which is normal for Sui package upgrades.
- **Source/deployed API drift:** GitHub/local `main` source exposes
  `new_with_custom_owner_caps_v2`, while deployed testnet bytecode inspection
  showed the older cap bundle name. Avoid cap-bundle helpers in U1; mint caps
  separately.
- **DEEP acquisition:** the current Oathkeeper witnessed path cannot use input-fee
  no-DEEP routing because the manager swap forces DEEP fees. Use DEEP/SUI pool or
  direct testnet DEEP funding before the SUI/DBUSDC witnessed swap.
- **CLI skew:** local `sui 1.60.0-homebrew` is too old relative to testnet server
  `1.73.1` and DeepBook `Published.toml` toolchain `1.69.2`.
- **Liquidity/min-size:** SUI/DBUSDC pool exists, but U1 still needs a dry run with
  an amount above pool min size and sane `min_quote_out`.

## Recommended Next Commands After `brew upgrade sui`

```bash
sui --version
sui client active-env
sui client object 0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8 --json
sui client object 0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5 --json
sui client object 0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f --json
```

Then update only the U1 run environment first:

```bash
export DEEPBOOK_PACKAGE_ID=0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8
export DEEPBOOK_REGISTRY_ID=0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1
export DEEP_TREASURY_ID=0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb
export DEEP_TYPE=0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP
export DBUSDC_TYPE=0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC
export DEEP_SUI_POOL_ID=0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f
export SUI_DBUSDC_POOL_ID=0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5
```

Build/verify dependency resolution before spending gas:

```bash
cd contracts
sui move build --test
```

If build is green, do the gas-spending spike in this order:

1. Create and share a BalanceManager.
2. Mint `TradeCap`, `DepositCap`, and `WithdrawCap` separately as manager owner.
3. Acquire/fund DEEP into the BalanceManager, likely by swapping SUI on the DEEP/SUI
   pool or using a known testnet DEEP source.
4. Deposit/prepare the swap base asset.
5. Run one SUI -> DBUSDC `trade_via_deepbook` PTB with low `min_quote_out`.
6. Read `balance<DBUSDC>(&BalanceManager)` and confirm Oathkeeper recorded the
   returned quote notional and post-swap equity.
