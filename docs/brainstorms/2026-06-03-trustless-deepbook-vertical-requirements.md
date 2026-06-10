---
date: 2026-06-03
topic: trustless-deepbook-vertical
---

# Trustless DeepBook Vertical — Verified Mechanism

## Problem Frame

Oathkeeper's central weakness (a 7-lens council's kill-shot): outcome attestation is self-reported — `record_trade` trusts caller-supplied equity/PnL/fills, so settlement enforces the math trustlessly but trusts the inputs. We set out to close this for ONE vertical (DeepBook) and asked an AI verification council whether "the proof can be verified correctly on-chain."

**Verified answer (the pivot):** the two forms we first proposed are **infeasible in Move**, confirmed against DeepBook v3 docs + source:
- **Settle-time "direct read" of fill history — NO.** DeepBook fills are transient **events** that DeepBook consumes into aggregates and discards. There is no on-chain per-account fill list, no trade **count**, no per-account **PnL**, and Move has no opcode to read historical events in-contract.
- **"Contract re-checks a keeper's reconciliation proof" — NO (doubly dead).** Move can't read events to re-check, **and** a settlement that *requires* a submitted off-chain proof has no safe timeout (default-to-self-report lets a liar grief keepers; default-to-Broken lets keepers grief honest operators). This "fallback" is the *worst* option — **do not build it.**

**What IS Move-enforceable (3 lenses converged):** **capture-at-execution / synchronous witnessing.** Route trades *through* the oath so the contract records DeepBook's **own returned executed amounts** (`swap_*` returns `(Coin,Coin,Coin)` in-call — unforgeable, no history read), plus a settle-time `balance<T>(&BalanceManager)` read (cross-package, no cap needed; BalanceManager is a **shared** object so any settler can pass it → liveness holds). The operator's self-report is never consulted.

**Honest limit:** only **drawdown-survival** is truly trustless. min_trades / min_volume / min_pnl are **wash-trade-gameable** even under witnessing (trade against a colluding wallet → real fills, real volume, PnL routed between wallets — nothing to detect). So drawdown-survival is the trustless headline; the rest are "witnessed, not wash-proof."

## Requirements

**Witnessed execution (the trustless core)**
- R1. Add a `trade_via_deepbook` path that records DeepBook's **returned executed amounts** — the entry has **no caller-supplied** equity/notional/count params at all (the unforgeability property).
- R2. Snapshot **starting equity from `balance<T>(&bm)` on-chain at `bind_exec_wallet`** — replace the self-reported `starting_equity_usdc` anchor (it's the anchor under both drawdown and PnL floors).
- R3. Derive the drawdown low-water-mark (`min_equity`) and final equity from `balance()`/equity-delta reads, never from operator input. Add a permissionless settle-time `balance()` read.
- R4. Derive PnL from **BalanceManager equity-delta**, not from summing witnessed fills (fill-sum is selectively bypassable: route winners through the oath, losers outside).

**Honest trust tiers**
- R5. Add `verifiability_tier` on the Oath, enforced in-contract: `WITNESSED` (DeepBook via `trade_via_deepbook`) vs `SELF_REPORTED` (Hyperliquid/maker/off-chain). Surface as the UI badge.
- R6. Narrow the TRUSTLESS headline to **drawdown-survival**; reframe `min_trades` as "min fills **routed through the oath path**"; disclose wash-trading + the volume-epoch mismatch in README + pitch.

**Non-gating reconciler + optional dispute**
- R7. `settle_epoch` stays **permissionless and always-terminating**; it NEVER gates on a submitted off-chain proof.
- R8. Upgrade the off-chain reconciler to parse `OrderFilled` events (asset/qty/price) as a **non-gating, DISPUTABLE detection layer** for maker/limit + Hyperliquid. Drop the "contract re-checks a keeper proof" framing entirely.
- R9. (Optional, only if the spine lands fast) bonded-optimistic `dispute_attestation` with a challenge window — an explicit honest-watcher liveness assumption; never gates the permissionless settle path.

**Demo**
- R10. The judge-runnable beat = **dead/lying operator**: operator self-reports a kept epoch while the bound DeepBook activity says otherwise → settle reads real on-chain equity + witnessed fills → resolves **Broken** on unforgeable inputs → the operator's claim was never consulted. Split-screen: claimed equity curve vs witnessed truth.

## Success Criteria
- A headless `sui move test` suite over `trade_via_deepbook` + a **faithful `mock_deepbook`** (mirrors real DeepBook: swap returns executed `(base,quote,DEEP)`; **no fictional settle-time fill-history read** — constraining the mock to reality prevents a false-green) proving: (1) unforgeability (entry has no caller equity/count params), (2) dead-operator → Broken, (3) drawdown low-water-mark across dip-then-recover, (4) Kept+Broken settlement matrix from mock output, (5) under-reporting asymmetry (un-routed fills can't mutate the Oath; under-reporting only ever yields Broken), (6) starting equity from `balance()` at bind, not a caller arg.
- A **day-1 testnet spike** that compiles + runs `balance<T>(&shared BalanceManager)` and one swap through an oath-held TradeCap.
- The split-screen demo runs on testnet.

## Scope Boundaries (deliberate non-goals)
- **No** settle-time fill-history read (impossible in Move) and **no** reconciler-gated post-hoc proof re-check (unbuildable + breaks liveness) — under any branch.
- **No** trusted verifier/oracle role (lending-keeper pattern, not prediction-market-oracle).
- **Do not claim** min_trades / min_volume / min_pnl are economically trustless — they're wash-gameable; drawdown-survival is the headline.
- Hyperliquid + uptime/behavior stay `SELF_REPORTED`/DISPUTABLE — do not fake their verifiability.
- Don't reopen the locked 5-role 10/20/70 economics.

## Key Decisions
- **Witnessing over settle-time read** — Move can't read events; the only unforgeable construction is capturing DeepBook's returned amounts at execution time.
- **Drawdown-survival is the trustless headline** — the only wash-resistant dimension (faking a survived drawdown requires actually surviving).
- **PnL from equity-delta**, starting equity from an **on-chain `balance()` anchor**.
- **Settle stays permissionless + always-terminating**; the reconciler is non-gating detection.

## Dependencies / Assumptions
- DeepBook v3 testnet wiring (pool liquidity + DEEP fee tokens + shared BalanceManager + TradeCap minting/binding) actually works — the **biggest risk**, validated by the day-1 spike. Single-coin denomination assumed so equity needs no price oracle.

## Outstanding Questions

### Resolved
- ✅ [Affects R1][User decision] **The witnessing inversion ACCEPTED** — operator executes DeepBook trades *through* the oath so the contract witnesses fills. Confirmed additive (a new trustless tier beside the existing self-reported path), not a pivot; nothing shipped is discarded.
- ✅ [Affects all][day-1 spike — COMPILE HALF GREEN] A sibling Move package depending on DeepBook v3 **compiles on our toolchain** (sui 1.60, edition 2024.beta) and the needed reads — `balance_manager::balance<T>(&bm)` and `pool::account(&pool,&bm).total_volume()` — **compile**; `swap_exact_base_for_quote` returns executed `(Coin,Coin,Coin)` and `_with_manager` routes through `&BalanceManager + &TradeCap` (confirmed from v3 source). Scaffold at `.context/deepbook-spike/`. **Verdict: GO on the witnessing hybrid.**

### Deferred to Planning
- [Affects R1][Technical — remaining spike] **Live testnet swap**: execute one real swap (real Pool + funded BalanceManager + DEEP fee tokens) and confirm returned executed amounts + a live `balance()` read. Gas-gated; the API is proven, the live wiring (DEEP fees, pool liquidity) is the only leftover risk. Do this early in the build.
- [Affects R1][Technical] Single-coin denomination + TradeCap/DepositCap/WithdrawCap binding mechanics at mint; exact `mock_deepbook` surface (must mirror real v3: no fictional settle-time history read).
- [Affects R8][Technical] `OrderFilled` event schema for the off-chain reconciler upgrade.

## Next Steps
→ `/ce:plan` — both blocking questions resolved (witnessing accepted; spike GREEN on compile). Planning should sequence the remaining live-swap spike first, then R1–R10.
