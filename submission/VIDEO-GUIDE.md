# Video Recording Guide — Oathkeeper

Operational companion to [`docs/DEMO-SCRIPT.md`](../docs/DEMO-SCRIPT.md). The demo script is
*what you say*; this is *how you record it* without tripping over the honest-scope boundary.

**Target:** ≤ 5 minutes. **Hard rule:** demo only what is live on testnet. Do NOT show or
claim the witnessed/DeepBook-trustless tier as live — it ships in source + tests, not in the
deployed package. (See the honest-scope section of SUBMISSION.md.)

## Before you hit record (prep checklist)

1. **Confirm the chain is still up.** On a networked machine:
   - `sui client object 0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9` (package resolves)
   - `sui client object 0x670b6d6e19fddcf7cf2d0877b8efb7b082be4a6a6c0f1cc3876a7ab238cd8838` (registry resolves)
   - If either fails, every live shot breaks — redeploy first (see SUBMISSION.md fix) or re-record against a fresh package.
2. **Pre-seed demo data** (so Shot 6 has a settled result ready): mint one **Kept** oath and one **Broken** (drawdown) oath using the 2-minute demo-epoch preset.
3. **Faucet all demo wallets** from the permissionless USDC faucet (show it once in Shot 4).
4. **Open tabs:** the frontend (`localhost:3000`), and Sui testnet explorer pre-loaded with: the mint PTB (Shot 3), a `record_trade` object (Shot 5), the settled distribution tx (Shot 6).
5. **Terminal ready** for `pnpm recon:demo` (Shot 5b) — run it once beforehand to confirm it prints the DISCREPANCIES verdict.
6. **Close** Slack/notifications; full-screen browser; 1080p+ capture; mic check.

## Shot list (maps to DEMO-SCRIPT.md)

| Shot | Time | What's on screen | Honesty note |
|------|------|------------------|--------------|
| 1 | 25s | The dilemma (operator with private edge vs. depositor trust) | conceptual — fine |
| 2 | 25s | Five roles + 10/20/70 split | conceptual |
| 3 | 35s | Live mint: one PTB, atomic bind — show the explorer tx | LIVE on testnet ✅ |
| 4 | 35s | Faucet, Believer + Doubter stake, sentiment chart | LIVE ✅ |
| 5 | 40s | `record_trade` by the bound exec wallet + live gauges | LIVE ✅ (self-reported tier — that's what's deployed) |
| 5b | 30s | "How do you know they didn't lie?" → `pnpm recon:demo` catches a fabricated fill | LIVE deterministic reconciler ✅ |
| 6 | 50s | `settle_epoch`: sum-zero distribution on Explorer (centerpiece) | LIVE ✅ |
| 7 | 30s | Roadmap card + witnessed tier as the trustless next layer + close | Frame witnessed as "code-complete, deploying next" — NOT live |

## What NOT to show (disqualification guards)

- Do not narrate the witnessed/DeepBook tier as "live on testnet." It is source + tests only.
- Do not show a `sui move test` run claiming a specific pass count (the suite needs CLI ≥1.69; don't film a green run you can't reproduce on the deployed toolchain).
- Do not show `agent/.env` or any private key on screen.
- If a live action lags/fails on camera, cut and retake — do not stage a fake success.

## After recording

1. Trim to ≤5 min, upload (unlisted/public YouTube).
2. Paste the URL into `submission/SUBMISSION.md` (Demo video link) and the Sui Overflow portal.
3. Verify the explorer links in SUBMISSION.md still resolve before final submit.
