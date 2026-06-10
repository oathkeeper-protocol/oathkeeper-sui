---
date: 2026-06-03
topic: verifiability-pivot
focus: close the attestation/verifiability gap + who-pays reframe + convert the 50% Real-World objection
---

# Ideation: Closing Oathkeeper's Verifiability Gap (post-council)

## Codebase Context

Oathkeeper-Sui — commitment-market / onchain-SLA on Sui, Sui Overflow 2026 (~19 days to deadline). Shipped: 8 Move modules, 53 tests, v2 5-role 10/20/70 economics, conservation proven on-chain (Kept + Broken), live testnet, full mint→stake→settle→claim, ed25519 binding, a deterministic open-source **reconciler** (detection only), a read-only **settlement verifier** (`pnpm verify`), Walrus SLA-doc store/read, Next.js app with a Verification panel.

**Central gap (a 7-lens council's unanimous kill-shot — the "verifiable-opacity scissor"):** `record_trade` is self-reported (operator types equity/PnL/fills); settlement enforces the math trustlessly but trusts the inputs. Only trustless on DeepBook (on-chain fills) — where opacity is moot — and fakeable everywhere opacity matters. Detection is shipped; enforcement (auto-slash) is roadmap.

**Council cruxes:** (1) trustless inputs not just settlement; (2) enforcement not detection; (3) a real buyer/consumer for Standing; (4) resolver separated from the market; (5) operator incentive (option-writing + adverse selection).

48 raw ideas across 6 frames → two adversarial skeptics → both independently collapsed the list to the same spine. Resolver-separation-as-a-standalone, Seal-reveal, Walrus-merkle, signed-HL-fills, EV-simulator, and economics-rebate clusters were all cut (sybil-unsolvable in 19d / reintroduces a trusted signer / reopens locked economics / not a demoable primitive).

## Ranked Ideas

### 1. Trustless DeepBook settlement — delete self-reported `record_trade` for the trustless vertical  ⭐ spine
**Description:** Add `settle_from_deepbook<T>()` that, for `VENUE_DEEPBOOK` oaths, derives `trade_count`, `cumulative_volume`, and `min_equity` from the bound `exec_addr`'s actual on-chain DeepBook fill/BalanceManager state at epoch end — instead of caller-supplied `equity_after`/`notional`. The Keep/Break math runs on inputs the operator cannot forge.
**Rationale:** Closes Crux 1 for the one vertical where it's provable in 19 days. Converts the 50% objection from "self-reported, waveable" to "settlement consumes chain state." This is the council's literal #1 recommendation.
**Downsides:** Gating unknown — DeepBook testnet fill-reading must work as expected; **verify this on day 1.** Touches the settle path (bug surface). Only the trading vertical.
**Confidence:** 80% · **Complexity:** Medium-High (~5-6d) · **Status:** Explored (→ brainstorm 2026-06-03)

### 2. Auto-slash on a deterministic fabrication proof (bonded-optimistic)  ⭐ spine
**Description:** Upgrade the inert `dispute_attestation` into `slash_on_fabrication`: a disputer posts a challenge bond + the reconciler's fabricated/mismatch finding (an attested `venue_tx_hash` absent from the authoritative DeepBook record); the contract re-checks existence on-chain; if confirmed, the operator's bond moves to the winner pool and status flips Broken — no human resolver.
**Rationale:** Closes Crux 2 (enforcement) and routes resolution through a deterministic proof, which sidesteps Crux 4 (a sybil resolver can't rubber-stamp). Turns the reconciler from a dashboard into infrastructure.
**Downsides:** Challenge-window mechanism = real mechanism design; keep it minimal. Trustless only where the venue is authoritative (DeepBook).
**Confidence:** 75% · **Complexity:** Medium-High (~5-6d) · **Status:** Explored (→ brainstorm 2026-06-03)

### 3. Live fabrication→slash demo (judge-runnable, split-screen)  ⭐ spine — the 50%-axis artifact
**Description:** One scripted-but-real testnet beat: operator self-reports a profitable oath-keeping epoch via `record_trade` while the bound DeepBook wallet did nothing → `settle_from_deepbook` reads the real (empty) fills → math resolves **Broken** on unforgeable inputs → reconciler proof files the dispute → **bond auto-slashes live**, split-screen (operator's claimed equity curve vs DeepBook truth).
**Rationale:** This single 90-second beat is the artifact that makes a judge *watch the chain catch and punish a liar* — the strongest possible answer to "what stops the operator lying?"
**Downsides:** Depends on #1 + #2 landing. Packaging, not new substance.
**Confidence:** 85% (if 1+2 land) · **Complexity:** Low (~3d) · **Status:** Unexplored

### 4. Honest trust-tier badge (contract-enforced TRUSTLESS vs DISPUTABLE)
**Description:** Stamp each oath with a `verifiability_tier` at mint: `TRUSTLESS` (DeepBook → must settle from on-chain fills, can't use `record_trade`) vs `DISPUTABLE` (Hyperliquid/off-chain → self-reported, dispute-only). The contract enforces it; the UI renders the badge.
**Rationale:** Wears the scissor as a *disclosed product axis* instead of a hidden weakness. Concedes nothing a judge could catch; pure honesty + Presentation (10%). Cheap.
**Downsides:** Honesty-labeling, not itself a verifiability fix — only valuable alongside #1.
**Confidence:** 80% · **Complexity:** Low (~3d) · **Status:** Unexplored

### 5. Invert who-pays — allocator-funded bounty mode (additive)  ⭐ the strongest reframe
**Description:** Add an additive mint path where the **allocator/Client posts the bond/bounty** and the operator binds a DeepBook exec wallet to earn it (plus Standing) by keeping the SLA — operator stakes only a small good-faith amount. Operator EV flips from ~14:1 option-writing to fee-earning. Reframes the product as **underwriting-as-a-service sold to allocators.**
**Rationale:** Dissolves Crux 5 (incentive/adverse selection) at the economics layer rather than patching it, AND creates a real Standing buyer (the allocator paying the bounty = Crux 3). Additive mint path → preserves the locked 10/20/70.
**Downsides:** ~7-8d; doing this *and* the full spine is too much for 19 days. Best built additively or narrated as the pitch reframe with a partial mint path.
**Confidence:** 70% · **Complexity:** High (~7-8d) · **Status:** Unexplored

### 6. Standing as a soulbound object + a consumer vault that gates on it
**Description:** On each Kept settlement, mint/update a non-transferable `StandingCert` keyed to the operator (kept_count, total_bonded, worst_drawdown_survived, breach_count). Ship one consumer — a minimal `AllocatorVault` that refuses to route capital unless Standing ≥ threshold and no open disputes.
**Rationale:** Closes Crux 3 with a *running second contract*, not a claim — "here is the buyer, on testnet." Composes directly with #5 (the bounty-posting allocator is the vault).
**Downsides:** Standing-object-alone is decorative; only counts with the consumer. ~5d.
**Confidence:** 70% · **Complexity:** Medium (~5d) · **Status:** Unexplored

### 7. Formally-proven conservation via Sui Prover (Technical-axis flourish)
**Description:** Use the Sui Prover (available through the `sui-pilot` Claude Code plugin's MCP) to formally *prove* the settlement conservation invariant (Σ in = Σ out across all roles, both Kept and Broken) rather than only testing it. Upgrades the pitch from "53 tests + a live verifier" to "conservation is formally proven."
**Rationale:** Hardens the exact thing the council *praised* (the math is trustless). A real Technical Implementation (20%) differentiator a judge can't wave away. Pairs naturally with the spine since `settle_from_deepbook` is new settlement logic worth proving.
**Downsides:** Additional tooling/scope; Move formal-verification annotations have a learning curve. Optional, not on the critical path. `sui-pilot` is a build tool, NOT a runtime integration — never pitch it as one.
**Confidence:** 65% · **Complexity:** Medium (~2-4d) · **Status:** Unexplored

## The build sequence both skeptics converged on
**Spine first (must-build): #1 → #2 → #3, wrapped in #4.** Answers 3 of 5 cruxes and is the technical + real-world proof. **Verify DeepBook testnet fill-reading on day 1 — it's the gating unknown.** Then **narrate #5 (invert who-pays)** as the reframe, building it additively + #6 only if the spine lands fast. If forced to cut: keep the spine, narrate the invert. Do **not** try to make Hyperliquid/uptime trustless in 19 days — badge them `DISPUTABLE` (#4) and own the one honest trustless vertical.

## Rejection Summary

| # | Idea | Reason rejected |
|---|------|-----------------|
| 9,17,25,33,47 | DeepBook settlement (variants) | Duplicates of #1 |
| 6,10,18,26,34,41 | Challenge-window / auto-slash variants | Duplicates of #2; #41's BREACH_FABRICATION reason folded in |
| 3,11,20,29,38,44 | Invert who-pays variants | Consolidated into #5 |
| 4,12,19,27,28,35 | Standing object / vault variants | Consolidated into #6 |
| 21,30,36,45 | Resolver-separation as standalone | Fresh-key sybil unsolvable in 19d; #2 already routes resolution through deterministic proof |
| 39 | Seal-committed fills + authorized-reveal | ~9d; reintroduces a trusted signer at the truth source |
| 31 | Walrus-anchored fill merkle root | Root is built from operator-supplied fills → proves nothing; plumbing-not-pitch |
| 23 | Signed Hyperliquid fills | Non-repudiable lies are still lies — self-attested |
| 37 | Standing-indexed stake rebate | Reopens the locked 10/20/70 economics |
| 32 | EV simulator + min-bond guard | A calculator artifact, not a primitive; #5 actually fixes EV |
| 7 | Equity-only from BalanceManager | Half-measure; leaves trade_count/PnL forgeable |
| 14 | Whole-product reframe to "proof-of-fill oracle" | ~9d pivot; abandons the locked commitment-market category |
| 22,48,8,16 | Pricing reframe / surety posture / tier-field / badge dupes | Cosmetic or honesty-labeling, dominated by #4/#5 |

## Session Log
- 2026-06-03: Initial ideation — 48 candidates across 6 frames, 2 adversarial skeptics, 6 survivors (spine of 3 + badge + reframe + consumer). Both skeptics independently converged on the #1→#2→#3 DeepBook spine as the must-build.
- 2026-06-03: Added survivor #7 (Sui Prover formally-proven conservation) after evaluating contract-hero/sui-pilot (a Claude Code dev-tooling plugin, not a runtime integration — useful for the DeepBook-API build + formal verification).
- 2026-06-03: Selected the **SPINE (ideas #1 + #2 + #3, wrapped in #4)** for brainstorming → handing off to `ce:brainstorm`. Marked #1/#2/#3/#4 Explored.
