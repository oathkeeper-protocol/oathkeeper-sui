# EXEC: Overnight Advisor Review

Date: 2026-06-13  
Role: adversarial hackathon advisor/reviewer  
Scope: DeFi & Payments readiness, proof quality, demo risk, UI/UX clarity, on-chain evidence, backend/indexer maturity, and mainnet/testnet blockers.

## Executive Judgment

Oathkeeper is directionally eligible for the Sui Overflow 2026 DeFi & Payments core track, but it is not yet good enough as a mainnet-ready winning submission. The track fit is strong: a bonded conditional-settlement rail for trust-minimized finance maps cleanly to programmable money, payment/financial systems, and controlled capital release on Sui. The current weakness is proof quality: the strongest claim in `STRATEGY.md` is WITNESSED DeepBook execution, but the repository evidence still shows live witnessed swaps blocked by toolchain/object/gas setup, no documented live WITNESSED oath on testnet, and no mainnet deployment.

Submission can still be viable if the project is ruthlessly honest: present the shipped core as a tested conditional-settlement protocol with self-reported/testnet flows, deterministic reconciliation, and a near-ready witnessed DeepBook path. A winning submission needs more: a real testnet WITNESSED oath minted through the capture-at-execution path, one real DeepBook swap, one WITNESSED settlement using the final BalanceManager anchor, the UI showing that oath without hand-staged state, and a mainnet package if the team wants the 100% upfront prize payout.

Official contest facts used for this review: Overflow 2026 core tracks include Agentic Web and DeFi & Payments; DeFi & Payments includes a $30K first prize; submission deadline is June 21, Demo Day is July 20-21, winners are announced August 27, and payout is 50% at winners announcement plus 50% after mainnet deployment unless already mainnet-deployed by winners announcement. DeepBook Predict is a separate specialized track requiring Predict integration; Oathkeeper's locked target is DeFi & Payments, not DeepBook Predict.

## Severity-Ranked Findings

### S0 - No live WITNESSED DeepBook proof yet, so the headline trust claim is not submission-grade

Evidence:

- `STRATEGY.md` makes WITNESSED execution the trustless core and lists live witnessed oaths, real DeepBook fills witnessed, and drawdown breach settlement as judge-facing proof points.
- `docs/plans/EXEC-backend-live-swap.md` says the live witnessed swap harness is near-runnable and gated on newer Sui CLI, live object IDs, funded wallets, and DEEP fee funding.
- `docs/research/deepbook-u1-live-swap-research.md` says U1 should proceed only after upgrading local Sui CLI and after creating/funding a BalanceManager, acquiring DEEP, running one `trade_via_deepbook` PTB, reading `balance<DBUSDC>`, and confirming Oathkeeper recorded the returned quote notional and post-swap equity.
- `frontend/src/lib/chain.ts` treats `balance_manager_id` as optional "until the witnessed package exposes the bound BalanceManager id in snapshots."

Risk:

Judges will not credit "trustless witnessed DeepBook" from code shape alone if the demo never shows one live DeepBook fill captured by the contract. Without that, the project falls back to self-reported attestations plus off-chain detection, which is weaker than the stated differentiator.

Required fix:

Before submission, produce a reproducible testnet artifact with object IDs and tx digests for: WITNESSED mint, DeepBook swap through `trade_via_deepbook`, final `settle_epoch_witnessed`, and the resulting `OathSettled` event.

### S0 - Mainnet readiness is currently unproven

Evidence:

- `STRATEGY.md` lists mainnet deployment as a binary judge-facing metric.
- `README.md` still lists mainnet deploy under roadmap and says it is scheduled Day 25.
- `frontend/src/lib/chain-config.ts` is testnet-only; `agent/src/config.ts` and `agent/src/sui/client.ts` default to testnet.

Risk:

The handbook payout structure makes mainnet deployment economically meaningful. If the project is not deployed to mainnet by winners announcement, payout is split 50/50; if not mainnet-ready by submission/demo, judges may doubt production seriousness. A testnet-only app can still submit, but "mainnet-ready winning submission" is not true yet.

Required fix:

Before claiming mainnet readiness, deploy the exact hardened package to mainnet, create a mainnet registry, update config paths to make network explicit, and record package/registry IDs plus deploy transaction digests in the submission packet.

### S1 - The README/demo story still overstates or conflicts with the current witnessed state

Evidence:

- `README.md` says "Witnessed tier (core) | Shipped" while also saying DeepBook glue is pending the live spike.
- `docs/DEMO-SCRIPT.md` still centers `record_trade` and explicitly says not to warm a DeepBook orderbook; that is self-reported attestation, not the new WITNESSED path.
- `docs/plans/EXEC-uiux-witnessed.md` says browser mint currently creates SELF_REPORTED oaths and WITNESSED DeepBook mint/settle needs the capture-at-execution path and bound BalanceManager anchor.

Risk:

The demo can accidentally promise trustless DeepBook while showing legacy `record_trade`. A sophisticated DeFi judge will detect the gap immediately: "Where is the DeepBook swap tx, and where did the Oath read BalanceManager state?"

Required fix:

Split claims into three labels everywhere: shipped self-reported settlement, shipped deterministic reconciliation, and live WITNESSED DeepBook proof. Do not use "shipped" for WITNESSED in public copy until the live path has testnet tx evidence.

### S1 - UI/UX clarity is improved, but the browser cannot complete the WITNESSED workflow

Evidence:

- `frontend/src/lib/ptb.ts` has browser builders for faucet, self-reported mint, stake, legacy settle, mark breach, claim, and `record_trade`.
- `frontend/src/app/(app)/oaths/[oathId]/DetailActionBar.tsx` blocks WITNESSED settlement when no `balanceManagerId` is available.
- `docs/plans/EXEC-uiux-witnessed.md` lists remaining work to expose the bound BalanceManager ID and add a browser PTB builder for anchor-aware WITNESSED settle.

Risk:

The UI can explain WITNESSED but cannot prove it end-to-end. That is acceptable for a backend-terminal demo only if the video makes the boundary explicit, but risky for Product & UX judging because the expected user flow is not complete.

Required fix:

Before submission, seed at least one live WITNESSED oath and make the detail page display: tier, BalanceManager object ID, DeepBook pool, swap tx digest, final-anchor settle tx digest, and settlement result. Browser signing for WITNESSED mint/trade can remain terminal-driven if the demo is honest, but WITNESSED evidence must be visible in the UI.

### S1 - Backend/indexer maturity is credible for detection, not for enforcement

Evidence:

- `agent/src/recon` has pure reconciliation tests and `OrderFilled` parsing.
- `README.md` and `agent/src/recon/README.md` correctly state that auto-slashing on a proven dispute is roadmap.
- `contracts/sources/attestation.move` dispute recording is durable but non-gating.

Risk:

Detection is valuable but not enough to sell "trust minimized settlement" for falsified fills unless the demo distinguishes detection from automatic financial consequence. If a judge asks what happens when the reconciler finds a fabricated fill, the current answer is "durable dispute signal, not slashing."

Required fix:

Keep the reconciler in the demo as a non-gating proof layer. Do not imply dispute findings change settlement unless bonded optimistic slashing is actually implemented.

### S2 - Mainnet/testnet environment dependencies are too manual for a fragile hackathon demo

Evidence:

- Live WITNESSED requires `OATHKEEPER_*`, `DEEPBOOK_*`, `SUI_DBUSDC_POOL_ID`, `DBUSDC_TYPE`, funded role keys, DEEP fee funding, and Sui CLI >= 1.69.
- `agent/src/sui/live-witnessed-swap.ts` correctly fails before spending gas when required inputs are missing, but the successful path still depends on many manually staged objects.

Risk:

The demo can fail for operational reasons even if the protocol design is sound: wrong network, unfunded BalanceManager, insufficient DEEP, stale package ID, missing caps, pool min-size, or a wallet mismatch between exec and promiser.

Required fix:

Create a single demo evidence file with frozen object IDs, env names, wallet roles, expected tx order, and fallback pre-recorded tx digests. Run the demo from known objects, not from fresh infrastructure, unless time remains.

### S2 - The "beyond trading" category proof should be minimized

Evidence:

- `CLAUDE.md` says single-vertical clean beats two-vertical half-shipped.
- `README.md` says UptimeOath and BehaviorOath are mintable but have no attestation adapters.

Risk:

Extra verticals dilute the DeFi & Payments proof and invite questions about unimplemented adapters. For this track, judges need programmable money and trust-minimized finance, not broad but shallow category claims.

Required fix:

Use beyond-trading only as a 10-second roadmap slide. Do not demo Uptime/Behavior. Do not imply they are trust-minimized today.

### S3 - `bd` workflow cannot be executed in this worker shell

Evidence:

- `bd onboard` returned `command not found`.

Risk:

Issue lifecycle cannot be updated from this session despite AGENTS.md requiring beads. This does not affect protocol readiness, but it affects project hygiene and handoff completeness.

Required fix:

Coordinator should either install `bd` in worker shells or accept Git/docs handoff for this task.

## Required Before Submission

1. Produce live testnet WITNESSED evidence:
   - WITNESSED oath object ID.
   - Oathkeeper package and registry IDs for the deployed package that includes `oathkeeper::witnessed`.
   - BalanceManager ID, TradeCap ID, DepositCap ID, WithdrawCap ID.
   - DeepBook pool ID and type args.
   - Mint tx digest.
   - `trade_via_deepbook` tx digest showing the DeepBook swap and Oathkeeper mutation.
   - `settle_epoch_witnessed` tx digest showing final anchor and settlement.

2. Upgrade and freeze the live-swap environment:
   - Sui CLI compatible with DeepBook v3 package resolution.
   - Correct DeepBook package replacement/version documented.
   - DEEP fee funding path documented and rehearsed.
   - One known-good env file template with no private keys committed.

3. Fix public claim boundaries:
   - Replace any public "WITNESSED shipped" claim that lacks live tx evidence with "contract path implemented and tests pass; live testnet proof pending" until proof exists.
   - Keep "drawdown-survival is wash-resistant" as the trustless headline.
   - Keep trades/volume/PnL labeled witnessed/routed but not wash-proof.

4. Update the demo script:
   - Add a WITNESSED proof shot or explicitly state the submission is self-reported plus reconciler.
   - Remove any implication that `record_trade` is the DeepBook witnessed path.
   - Keep architecture after the user problem and settlement proof.

5. Make WITNESSED evidence legible in the UI:
   - Detail page shows WITNESSED tier, BalanceManager ID, DeepBook swap tx, final-anchor settle tx, and Explorer links.
   - Browser action bar must not offer legacy settlement for WITNESSED oaths.
   - Seed one live WITNESSED oath in the snapshot or live deployment.

6. Run and record quality gates:
   - `cd contracts && sui move build`.
   - `cd contracts && sui move test`, or document exact toolchain blocker.
   - `cd agent && pnpm test && pnpm typecheck`.
   - `cd frontend && pnpm lint && pnpm build`.

7. Prepare a judge packet:
   - Track: DeFi & Payments only.
   - Links: repository, app, video, testnet explorer objects/txs.
   - One-paragraph proof boundary.
   - One-page demo proof checklist below.

## Required Before Mainnet / Winner-Payout Claim

1. Deploy hardened contracts to Sui mainnet:
   - Package ID.
   - Registry ID.
   - Deployment tx digest.
   - Exact git commit hash.
   - Network-specific config that cannot silently point testnet UI at mainnet claims.

2. Remove mock-only dependencies from any mainnet story:
   - No mock USDC faucet in mainnet demo.
   - Use real Sui coin/token handling or clearly restrict mainnet deployment to protocol package without economic TVL.

3. Mainnet proof run:
   - At minimum, mint a low-value mainnet oath and settle it through the intended mainnet path.
   - If claiming WITNESSED on mainnet, execute one real DeepBook mainnet witnessed trade and anchor settlement.

4. Operational controls:
   - Role keys documented and separated.
   - Package upgrade policy stated.
   - Mainnet object IDs pinned in app/agent config.
   - No private keys or `.env` secrets committed.

5. Submission/payout evidence:
   - Mainnet deploy date before August 27, 2026 if seeking 100% upfront payout.
   - If not mainnet-deployed by winners announcement, do not claim upfront payout readiness.

## One-Page Demo Proof Checklist

Use this as the recording checklist. Every checked item should have a visible UI state, terminal output, or Explorer link.

### Track And Claim Boundary

- DeFi & Payments selected; no DeepBook Predict claim.
- Opening line says programmable conditional settlement / bonded capital, not prediction market.
- Trustless headline is WITNESSED drawdown survival, not wash-proof PnL or volume.
- Reconciler is described as deterministic detection and dispute evidence, not auto-slashing.

### On-Chain Contract Proof

- Package ID shown.
- Registry ID shown.
- Oath object ID shown.
- Mint tx shown.
- Stake-for and stake-against txs shown.
- Settlement tx shown.
- Balance changes or event fields show conservation.

### WITNESSED DeepBook Proof

- WITNESSED tier visible on the oath.
- BalanceManager ID visible.
- DeepBook pool ID visible.
- `trade_via_deepbook` tx digest visible.
- Returned executed amount or recorded notional visible.
- Post-trade BalanceManager `balance()` anchor visible or documented.
- `settle_epoch_witnessed` tx digest visible.
- Legacy `record_trade` is not presented as witnessed DeepBook.

### Reconciler Proof

- `pnpm recon:demo` or `pnpm reconcile <oathId>` runs.
- Output distinguishes clean, fabricated, missing, or mismatched fill.
- Any `--dispute` tx is optional; if shown, it is described as durable dispute record only.

### UI/UX Proof

- Browse page loads live testnet data.
- Oath detail page shows status, tier, dimensions, pools, sentiment, and verification panel.
- Action bar blocks invalid WITNESSED legacy settlement when missing BalanceManager anchor.
- Explorer links open the relevant objects/txs.

### Mainnet Proof

- If mainnet is claimed: package ID, registry ID, and deploy tx are shown on mainnet Explorer.
- If mainnet is not deployed: demo explicitly says testnet submission, mainnet before payout/winners is pending.

## Bottom Line

The protocol thesis is strong enough for DeFi & Payments. The current artifact is not yet strong enough to win on the witnessed-trustless claim unless live WITNESSED DeepBook evidence is produced and made visible. The shortest winning path is not more features; it is one undeniable proof chain from WITNESSED mint to DeepBook swap to final BalanceManager-anchored settlement, plus a clean demo that never overclaims beyond that evidence.
