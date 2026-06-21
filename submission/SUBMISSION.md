# Oathkeeper — Sui Overflow 2026 Submission

> **Verifiable opacity, bonded on Sui.** A commitment market for any opaque actor with private edge. Bond the outcome, keep the work private, let doubt price it in real time.

**Track:** Sui Overflow 2026 — DeFi & Payments
**Deadline:** June 21, 2026

---

## REMAINING HUMAN STEPS (everything else is done & verified)

The repo is **public**, the testnet deployment is **live & verified**, and all docs are
**honest-scoped**. Only these need a human:

1. **Use Node ≥ 20** in your shell (`nvm use 20`), then optionally `cd agent && pnpm test`
   to show the suite green on camera. (The agent requires Node 20+.)
2. **Record the ≤5-min video** following [`docs/DEMO-SCRIPT.md`](../docs/DEMO-SCRIPT.md) +
   [`VIDEO-GUIDE.md`](./VIDEO-GUIDE.md). Demo the **live** economics + reconciler. Frame the
   witnessed/DeepBook tier as *"code-complete, deploying next"* — NEVER as live (it is not in
   the deployed package; saying so risks disqualification).
3. **Paste two URLs below** (video, frontend), then `git commit -am "docs: submission links" && git push`.
4. **Submit on the Sui Overflow portal** with the repo link + video URL.

---

## Links (HUMAN: paste before submitting)

- **GitHub repo:** https://github.com/oathkeeper-protocol/oathkeeper-sui
- **Demo video (≤5 min, YouTube):** `[DEMO VIDEO URL — paste after recording]`
- **Live frontend:** `[LIVE FRONTEND URL — paste if deployed; else note "run locally per README"]`
- **Testnet package (explorer):** https://suiscan.xyz/testnet/object/0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9
- **Registry object:** https://suiscan.xyz/testnet/object/0x670b6d6e19fddcf7cf2d0877b8efb7b082be4a6a6c0f1cc3876a7ab238cd8838

---

## One-line pitch

Onchain SLA infrastructure: an operator with private edge bonds USDC against a multi-dimensional, self-authored oath; Believers and Doubters stake on whether it holds; settlement resolves on the operator's own on-chain behavior — not the world's.

---

## What we built (honest shipped-vs-roadmap)

### Shipped and verifiable

- **Move protocol** — 7 modules + mock USDC. Multi-dimensional oath tuple (drawdown / min-trades / min-pnl), scope-uniqueness enforcement, signature-bound exec wallet (`ed25519` native verify), permissionless settlement, conservation-checked payouts across the 5 roles.
- **On-chain testnet deployment (SELF_REPORTED tier)** — package `0xae9da7ca…`, registry `0x670b6d6e…`, mock-USDC TreasuryCap `0x44c87671…`. E2E Kept and Broken settlement runs verified on testnet (payout sums conserve to zero).
- **Deterministic reconciliation verifier** — `agent/src/recon`: pure, dependency-free reconcile logic that catches fabricated fills. Proven by 14 passing vitest cases + an offline `pnpm recon:demo` that prints a provable DISCREPANCIES verdict. This is a deterministic indexer, not an "AI verifier."
- **Frontend** — Next.js + dapp-kit. Browse / Detail / Mint / Portfolio; reads live testnet data; real on-chain write path (faucet, mint, stake, settle, claim).

### Code-complete, NOT live on testnet (state this plainly)

- **Witnessed (trustless DeepBook) tier** — `witnessed.move` (`mint_witnessed`, `trade_via_deepbook`, `settle_epoch_witnessed`) is written and Move-typed against `deepbook::pool`. It is **not deployed to the current testnet package** and no live witnessed DeepBook fill has been captured on-chain. Live execution is gated on a Sui CLI upgrade (≥1.69) + DeepBook dep resolution + funded exec wallet. Framed as code-complete, not "live-proven."

### Roadmap (not implemented)

- Seal confidentiality layer (Walrus storage half is round-trip verified; Seal access-control Move module is not written).
- DeepBook fill-level reconciliation (live venue source is digest-existence today).
- Dispute auto-slashing (disputes are recorded on-chain; bonded challenge window + slashing is next layer).
- UptimeOath / BehaviorOath adapters (enum variants mintable; no prober/judge).
- Mainnet deploy.

---

## Eligibility (Sui Overflow rules)

Prior art: a 0G Solidity prototype (Orichalcos) informed the economic design only. Substantial new functionality built in the hackathon window: full Move re-implementation, multi-dimensional oath tuple, scope-uniqueness, signature-bound exec wallet with replay protection, deterministic reconciliation indexer + on-chain dispute record, DeepBook execution venue. No Solidity was ported line-by-line. Reused: economic parameters, simulation math, UI patterns, pitch structure — disclosed in README Acknowledgments.
