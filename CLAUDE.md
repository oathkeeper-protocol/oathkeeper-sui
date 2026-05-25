# Oathkeeper-Sui — CLAUDE.md

> Read this first in any code session for this project.

## Project context

**Oathkeeper-Sui** is a Sui Move re-implementation of a commitment-market protocol previously prototyped on 0G under the name *Orichalcos*. The Sui submission targets **Sui Overflow 2026 — DeFi & Payments track**, deadline **June 21, 2026**.

**Reference (do not copy wholesale):** the 0G prototype lives at `/Users/ammar.robb/Documents/Web3/hackathons/hackquest-0g/`. Read it freely for economic-design context, simulation math, and demo narrative. **Do not** translate Solidity line-by-line — Sui's object model is structurally different and a naive port will produce bad Move.

## Brand vocabulary — use these terms consistently

| Term | Meaning |
|------|---------|
| **Oathkeeper** | Protocol name + the user role that bonds against an oath |
| **Oath** | The on-chain commitment object |
| **Doubter** | The user role that stakes against an oath |
| **Standing** | An Oathkeeper's reputation track record |
| **Keep / Break** | Verbs for the two outcomes |
| **Bond / Stake** | The Oathkeeper's principal / the Doubter's smaller wager |
| **Verifiable opacity** | Category-level pitch phrase. The product Oathkeeper sells: the ability to make a private claim publicly costly to fake. The mechanism stays private; the outcome is bonded and verified. The universal dilemma (show-the-work / hide-the-work / bond-the-outcome) lives in `submission/PITCH-COPY.md`. |

❌ Do NOT use: "trader" (use Oathkeeper), "challenger" (use Doubter), "promise" in serious prose (use Oath), "insurance" (use Bond/Stake/Settlement), "policy" (legacy 0G term — say Stake or Doubter Position), "bet on yourself" / "TSLA-market" framing (the product is verifiable opacity, not directional speculation).

## Track strategy (locked — do not reopen)

- **Track:** DeFi & Payments only. Not Walrus. Not Agentic Web. Not DeepBook Predict.
- **Reason:** Real-World Application is 50% of Sui's grade. Oathkeeper is a programmable money primitive — a market for verifiable behavioral commitments. That's a DeFi & Payments pitch, not an agent demo and not a memory-layer demo.
- **Walrus is used, but it's plumbing, not the pitch.** Same with Seal. Same with DeepBook execution. Sui-native integration scores on the 20% Technical Implementation criterion, not the 50% Real-World one.

## Multi-dimensional oath — the core anti-fraud mechanic

A single-dimension oath (drawdown only) lets an Oathkeeper bond capital, do nothing for the epoch, and earn from Doubters. This is the **dead-trader exploit** (the "trader" framing is correct at the domain level — the user IS an AI trader — but the protocol role is Oathkeeper). It's the first question any sharp judge will ask.

The oath tuple has at least three dimensions; all must hold for the oath to be Kept:

1. `max_drawdown_bps` — equity floor (mid-epoch breach trigger)
2. `min_trades` — minimum fills required (end-of-epoch breach trigger)
3. `min_pnl_bps` — minimum net return (end-of-epoch breach trigger)
4. `min_volume_usdc` — optional 4th dimension

The contract MUST reject mints with `min_trades < 1` — that's the fence against degenerate oaths.

## Scope uniqueness — the anti-duplication mechanic

`(promiser_addr, scope_hash)` must be unique. An Oathkeeper cannot create two parallel BTC oaths. Enforced via a `Table<Key, OathId>` lookup at mint time.

Scope hash inputs:
- `exec_addr` (bound execution wallet)
- `venue` (DeepBook / Hyperliquid)
- `allowed_assets` (sorted vector for stable hashing)
- `epoch_duration_ms`
- `promise_dimensions` (the oath tuple)

## Signature-bound exec wallet — the anti-claim-jumping mechanic

The trader provides a signature from `exec_addr` over the scope+oath tuple at `start_epoch()`. The contract verifies it with Sui's `ecdsa_k1` module (for EVM-compatible Hyperliquid binding) or `ed25519` module (for Sui-native DeepBook binding).

**Verified May 20:** Sui Move ships `ecdsa_k1::secp256k1_ecrecover` (equivalent to Ethereum's `ecrecover`) and `ecdsa_k1::secp256k1_verify` (sig + pubkey + message + hash flag). EVM-style Hyperliquid signature binding IS implementable in Move without external dependencies. Day 1 architectural unknown resolved.
- Sui ecdsa_k1 module ref: https://www.docs.sui.io/references/framework/sui_sui/ecdsa_k1
- Cross-chain signature guide: https://tech.mystenlabs.com/cryptography-in-sui-cross-chain-signature-verification/

Replay protection: the signed message includes `oath_id`, `epoch_id`, `binding_nonce`, `valid_from`, `valid_until`.

A single `exec_addr` may not back two active oaths simultaneously. Enforced via a `Table<address, OathId>` lookup.

## Reconciliation indexer

Off-chain. Open-source. Anyone can run it. Reads the bound `exec_addr`'s full venue history (Sui indexer for DeepBook, Hyperliquid API for HL), diffs against on-chain `record_trade` attestations, flags any missing or fabricated fills. Doubters can file disputes via `dispute_attestation(oath_id, proof)`.

This is NOT an "AI verifier" — it's a deterministic indexer. Pitching it as AI weakens the trust model.

## Phase-0 expansion — multi-vertical commitment market (locked May 21)

**Mantra: trading is the depth; multi-vertical is the proof of category.**

The submission ships an `OathType` enum + per-type attestation adapter pattern. Three verticals are in v1 scope at varying depths; two are enum-only roadmap signals.

| Vertical | v1 scope | Demo time |
|----------|----------|-----------|
| `TradingOath` | Full: DeepBook + Hyperliquid attestation, reconciliation indexer, Scenarios A/B/C/D | ~80% (Shots 1-6) |
| `UptimeOath` | Real adapter + open-source HTTPS prober + 1 live attested oath | ~30s (Shot 7a) |
| `BehaviorOath` | Mock judge attestation, contract enum dispatch is real | ~10s (Shot 7b) |
| `ValidatorOath` | Enum variant only, rejected at mint, roadmap slide | 0s |
| `TreasuryOath` | Enum variant only, rejected at mint, roadmap slide | 0s |

**Hard cut-line — Day 17 (Jun 5) EOD:** if `UptimeOath` adapter + prober is not testnet-functional, drop Vertical #2 from the submission. Strip Shot 7a. Keep the enum variant. Single-vertical clean beats two-vertical half-shipped. See `docs/SPRINT-PLAN.md` "Vertical priority" for the full sacrifice order.

Week 1 (May 20-26) is **sacred** — no multi-vertical work touches it. The `OathType` enum refactor lands Day 10 (Week 2). See `docs/ARCHITECTURE.md` "Phase-0 Expansion" for adapter trait shape and per-vertical specs.

## Out of scope (intentionally — do NOT scaffold)

- Dynamic/TEE-priced premiums (0G v4 roadmap)
- Vault-routing for idle capital (0G v3.5 roadmap)
- Multi-asset oaths with cross-asset hedging logic
- Real (non-mock) LLM-jury attestation for `BehaviorOath` — v2 only
- Validator/Treasury adapter implementations — enum-only in v1

The pitch deck mentions these as roadmap. The contracts do not implement them. **Three verticals shipped at honest depths, not five faked.**

## Eligibility note (Sui Overflow rules)

Per the Sui FAQ: *"Existing projects are permitted only if substantial new functionality, features, or integrations are developed specifically during the hackathon period."*

The 0G Orichalcos prototype is **prior art that informs design**, not code that ports verbatim. Substantial new functionality in this build window:

- Full Move re-implementation (Solidity → Move is structural, not syntactic)
- Walrus integration (replaces 0G Storage)
- Seal integration (replaces 0G Compute TEE)
- DeepBook execution venue (replaces Hyperliquid-only execution)
- Multi-dimensional oath tuple (was deferred to "v3.5" on 0G — landed in v1 here)
- Scope-uniqueness enforcement (new)
- Signature-bound exec wallet with replay protection (new — 0G used social wallet-pairing convention)
- Open-source reconciliation indexer + dispute mechanism (new)

Code reuse permitted under FAQ: economic design parameters, simulation math, frontend UI patterns, pitch deck structure. Disclosed in the README's Acknowledgments section.

## Tech stack

| Layer | Tool |
|-------|------|
| Smart contracts | Sui Move (latest mainnet-compatible toolchain) |
| Storage | Walrus (encrypted oath text + per-trade attestation blobs) |
| Encryption / access control | Seal |
| On-chain execution | DeepBook |
| Cross-chain execution (optional) | Hyperliquid testnet, bound via signature |
| Agent runtime | TypeScript |
| Frontend | Next.js 14 (port UI patterns from `hackquest-0g/dashboard/`) |
| Indexer | TypeScript, deterministic, open-source |

## 32-day sprint structure

```
WEEK 1 (May 20-26) — CONTRACTS — HARD GATE May 26 EOD
  Day 1-2: Move object design (oath, doubter position, registry)
  Day 3-5: Port economic logic (mint, stake, attest, mark_breach, settle)
  Day 6-7: Move tests (target ≥30 passing)
  ⚠️ Gate fail → pivot to Anamnesis on Walrus track

WEEK 2 (May 27-Jun 2) — WALRUS + SEAL
  Day 8-9: Walrus client integration (sealed oath text upload + merkle root)
  Day 10-11: Seal encryption + authorized-runtime decrypt path
  Day 12-13: Per-trade attestation blobs
  Day 14: End-to-end mint flow on testnet

WEEK 3 (Jun 3-9) — DEEPBOOK + AGENT + INDEXER
  Day 15-17: DeepBook integration (place + attest orders)
  Day 18-19: TypeScript agent runner (port strategy logic from 0G)
  Day 20: Reconciliation indexer (deterministic, open-source)
  Day 21: Scenarios A/B/C/D on testnet

WEEK 4 (Jun 10-21) — FRONTEND + MAINNET + DEMO
  Day 22-24: Next.js frontend port from 0G dashboard
  Day 25-26: Mainnet deploy (100% prize requires this)
  Day 27-28: Demo video (≤5 min, 7 shots)
  Day 29-30: Pitch deck, README polish, submission packet
  Day 31: Buffer
  Day 32 (Jun 21): SUBMIT
```

## Judging-criteria reminders

| Weight | Criterion | What to optimize for |
|-------:|-----------|---------------------|
| **50%** | Real-World Application | Concrete users (anon AI traders + allocators), concrete pain, measurable impact, generalization story |
| 20% | Product & UX | Wager creation in ≤6 seconds, doubter flow in ≤3 clicks, clean equity-curve visualization |
| 20% | Technical Implementation | Native Sui object model, meaningful DeepBook + Walrus + Seal use, deterministic indexer |
| 10% | Presentation & Vision | "Beyond Trading" vertical map, commitment-market category framing |

## Anti-patterns — never do these

- ❌ Do not call it a "prediction market." It is a **commitment market**. The whole pitch hinges on this distinction.
- ❌ Do not pivot the framing mid-build. The 0G submission pivoted twice. Sui locks v1 on day 1.
- ❌ Do not stack multiple Sui tracks. One submission, one track (DeFi & Payments).
- ❌ Do not claim "TEE-attested inference" on Sui. The Sui version uses Seal, not TEE.
- ❌ Do not lead the demo with architecture. Lead with the user (anon AI trader) and the pain (rug vs alpha-decay dilemma).
- ❌ Do not invert the vertical ratio under pressure. Trading is ~80% of demo and the only fully-shipped attestation pipeline. Uptime and Behavior are depth-proofs, not co-headliners.
- ❌ Do not fake a vertical. If Uptime gets dropped at the Day-17 gate, do not record a staged demo for it. Honest single-vertical beats dishonest multi-vertical every time.
- ❌ Do not use Solidity → Move syntax translation. Redesign for Sui's object model.

## Cross-references

- **Battle map (master strategy doc):** `/Users/ammar.robb/Documents/Web3/hackathons/MAY-2026-BATTLE-MAP.md`
- **0G prior art (reference only):** `/Users/ammar.robb/Documents/Web3/hackathons/hackquest-0g/`
- **Mantle parallel project:** Steampunk-on-Mantle (see `MAY-2026-BATTLE-MAP.md` for details). Different product, different chain, different track — eligible to run in parallel under Sui's "meaningfully different projects" rule.
