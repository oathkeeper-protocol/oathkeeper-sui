# Sprint Plan — 32 days to Sui Overflow submission

> Generated: 2026-05-20
> Submission deadline: **2026-06-21**
> Hard gate: end of Week 1 (May 26) — contracts must compile + pass tests, else fall back to Anamnesis

## Week 1 (May 20-26) — CONTRACTS

| Day | Date | Task | Done |
|-----|------|------|:----:|
| 1 | May 20 | Project scaffold + ARCHITECTURE.md design decisions locked | ⬜ |
| 2 | May 21 | Oath module — struct, mint entry, scope-uniqueness table | ⬜ |
| 3 | May 22 | Doubter module — Position object, stake entry, payout math | ⬜ |
| 4 | May 23 | Attestation module — record_trade, asset allowlist enforcement | ⬜ |
| 5 | May 24 | Settlement — mark_breach (perm), settle_epoch (perm), 60/40 splits | ⬜ |
| 6 | May 25 | Signature module — ed25519 + ecdsa_k1 verification, replay nonce | ⬜ |
| 7 | May 26 | Tests — target ≥30 passing | ⬜ |

**Gate check (May 26 EOD):**
- [ ] All modules compile cleanly with `sui move build`
- [ ] ≥30 tests passing via `sui move test`
- [ ] No `TODO`, no stubs, no commented-out functions in committed code
- [ ] Architecture decisions in ARCHITECTURE.md match shipped code

**Gate fail action:** abandon Move port. Pivot same day to Anamnesis (Walrus-track agent memory). Sprint replan for the remaining 25 days.

## Week 2 (May 27-Jun 2) — WALRUS + SEAL + OathType + Trading Adapter

> Phase-0 multi-vertical work starts here. **Week 1 (May 20-26) is sacred and does not absorb any of this scope.** The `OathType` enum lands as the first refactor of Week 2 because every adapter downstream depends on it, but adapter implementations are spread across Weeks 2-4 so trading depth never gets squeezed.

| Day | Task |
|-----|------|
| 8 | Walrus TypeScript SDK setup, hello-world blob upload |
| 9 | Sealed-oath-text upload pipeline; commit merkle root to Oath object |
| 10 | `OathType` enum + `attestation_adapter` trait shape landed in contracts (small refactor, no behavior change for trading path). Re-run Week 1 test suite — must stay green. |
| 11 | Seal access policy: bound exec_addr can decrypt oath text |
| 12 | `adapter_trading` module — extract trading-specific record_trade / drawdown / count / pnl / volume logic into the adapter. Trading path now flows through the dispatch. |
| 13 | Per-trade attestation blob upload + on-chain commitment. End-to-end mint flow on testnet (real wallet, real Walrus, real Seal). |
| 14 | Buffer / debugging / mint flow demo recording prep (low-fi) |

## Week 3 (Jun 3-9) — DEEPBOOK + AGENT + INDEXER + Uptime Adapter

> **Hard cut-line at Day 17 EOD (Jun 5):** if `adapter_uptime` is not testnet-functional with at least one prober posting signed attestations to an UptimeOath, drop Vertical #2 entirely. Strip Shot 7a from the demo, keep the enum variant + pitch-deck slide. Better single-vertical clean than two-vertical half-shipped.

| Day | Task |
|-----|------|
| 15 | DeepBook integration — place a real testnet order from the agent. record_trade pipeline wired through `adapter_trading`. |
| 16 | Hyperliquid binding (optional secondary venue) with signed-per-trade attestations. |
| 17 | `adapter_uptime` module + open-source TypeScript HTTPS prober. One live UptimeOath posting signed ping reports on testnet. **GO/NO-GO gate EOD.** |
| 18 | TypeScript agent runner — port strategy archetypes from 0G (sharp, bold, patient, stoic) |
| 19 | Scenarios A (kept), B (mid-epoch breach), C (LP cycle), D (settle-time breach for insufficient trading) |
| 20 | Reconciliation indexer — open-source, deterministic. Trading vertical only; the prober is its own attestation source for UptimeOath. |
| 21 | dispute_attestation entry + indexer-driven dispute flow demo |

## Week 4 (Jun 10-21) — FRONTEND + MAINNET + DEMO + Behavior Mock

| Day | Task |
|-----|------|
| 22 | Next.js scaffold; port `/oaths`, `/oaths/[id]`, `/protocol` pages from 0G dashboard |
| 23 | Oath creation flow + Doubter stake flow. Frontend handles `OathType` switch on creation UI (trading is the default tab; uptime/behavior are secondary). |
| 24 | Live equity-curve viz + breach indicator + settle button. `adapter_behavior` mock module + a pre-scripted BehaviorOath for demo evidence (10s of Shot 7). |
| 25 | Mainnet contract deploy — required for 100% prize payout per handbook |
| 26 | Mainnet smoke test of all 4 trading scenarios + 1 uptime oath (if shipped) + 1 behavior oath |
| 27 | Demo video recording (7 shots, ≤5 min) — see DEMO-SCRIPT.md |
| 28 | Pitch deck (8 slides) — opens on commitment-market category, closes on Beyond Trading verticals (now backed by shipped adapters, not just slides) |
| 29 | README polish, submission packet sections 1-8 |
| 30 | Project logo, 1:1 ratio (per handbook submission checklist) |
| 31 | Buffer / fix last-mile demo issues |
| 32 (Jun 21) | SUBMIT before deadline |

## Vertical priority — do not invert under pressure

If any week slips, sacrifice in this order:
1. BehaviorOath mock (Week 4) — cheapest to drop, smallest demo footprint.
2. UptimeOath real adapter (Week 3 Day 17 cut-line) — the prober is the riskiest scope.
3. Hyperliquid secondary venue (Week 3 Day 16) — DeepBook alone is sufficient for the trading vertical.
4. **NEVER sacrifice:** Scenarios A/B/C/D on DeepBook, mainnet deploy, demo recording, sealed-oath-text on Walrus.

## Parallel work (Mantle Turing Test — Steampunk-on-Mantle)

Mantle submission is **Jun 15** (research-verified May 20), six days before Sui. Mantle is a separate scaffold at `hackathons/steampunk-mantle/` — it's a rebuild on Mantle EVM with ERC-8004, not a port from `steampunk-hedera/` (40% of the Hedera code is HCS-10/HTS-specific and doesn't port). Both submissions are meaningfully different products (different chain, different mechanism — game arena vs commitment market) per Sui's FAQ rule on multiple submissions.

If Mantle conflicts with the Sui Week 1 gate (both have hard gates ending May 26), **prioritize Sui Week 1.** Sui's prize ceiling and 50%-Real-World-Application weighting punish diluted attention. Mantle is dropped automatically if Sui Week 1 slips.

## ElevenHacks final week (May 28)

Short distraction. Voice-narrated agent battles ("Coliseum Caller"). 8 days of work, parallel to Sui Week 1-2. Total commitment: 5 days code + 2 days video + 1 day polish. Drop entirely if Sui Week 1 slips.
