# Oathkeeper — Updated Design Document
> Version 2.0 | Sui Overflow 2026 | DeFi & Payments Track

---

## One-Liner

Oathkeeper is an onchain SLA infrastructure where operators bond capital against service promises, open markets price their reliability in real time, and settlement is automatic with zero arbitration.

---

## The Problem

### 1. Operators Can't Make Credible Promises

Every operator making a promise — a trader claiming performance, an RPC provider claiming uptime, an AI model claiming behavior — faces the same broken choice:

- **Show the work** → edge decays, strategy copied, alpha front-run
- **Hide the work** → claims are worthless, indistinguishable from fraud
- **Bond the outcome** → keep the work private, make the promise publicly costly to fake

There is no third option today. Operators either expose their edge or make promises nobody can verify. Both outcomes are bad.

### 2. Clients Have No Onchain Recourse

When a service provider fails to deliver — trader blows up, RPC goes down, API breaks SLA — the client's only recourse is:

- Legal action (slow, expensive, often impossible across jurisdictions)
- Chargeback (only works for fiat, not crypto services)
- Social reputation damage (weak, gameable, not binding)

None of these are automatic. None are trustless. None settle in seconds.

### 3. Traditional SLAs Are Unenforceable Onchain

A traditional SLA is a legal document. Enforcing it requires:
- Lawyers
- Courts
- Arbitrators
- Trusted intermediaries

This is incompatible with pseudonymous operators, cross-border services, and the speed at which DeFi moves. A trading bot running for 30 days can't wait 6 months for arbitration.

### 4. Existing Onchain Alternatives Are Incomplete

| Existing Solution | What It Solves | What It Misses |
|---|---|---|
| Simple escrow | Capital locked against delivery | No market pricing of reliability, no track record, no secondary market |
| Prediction markets (Polymarket, UMA) | Binary outcome pricing | Subject is not a participant, can't author the claim, no bilateral contract |
| Copy trading vaults (Hyperliquid) | Capital follows skilled traders | Strategy exposed, no privacy, no verifiable commitment |
| Reputation systems (Nansen labels) | Heuristic wallet scoring | Not cryptographic, not bonded, not enforceable |

**No existing primitive combines: capital bonding + bilateral SLA + open market pricing + automatic trustless settlement.**

That gap is what Oathkeeper fills.

---

## Unique Selling Points

### USP 1 — Verifiable Opacity

Oathkeeper is the only protocol that lets an operator make a **privately-held promise publicly costly to fake.**

The strategy stays secret. The bond is public. The settlement is automatic. The track record is permanent.

An anonymous AI trader doesn't need to reveal their alpha. They need to make their claim expensive to fake. Oathkeeper provides exactly that — without exposing the edge that makes the claim valuable.

### USP 2 — Zero Arbitration Settlement

Settlement in Oathkeeper is **fully deterministic and permissionless.**

No oracle. No human judge. No governance vote. No dispute window.

Breach conditions are defined at oath creation and evaluated directly against onchain state. When conditions are met, anyone can trigger settlement. The contract does the rest automatically.

This is the property that UMA, Polymarket, and every optimistic oracle system cannot offer — they all have a dispute window where humans can intervene. Oathkeeper's settlement reads from onchain data that neither party controls.

### USP 3 — Bilateral Contract With Open Market Layer

Most DeFi primitives are either bilateral (escrow, loan) or open market (AMM, prediction market). Oathkeeper is both, layered cleanly:

```
Layer 1 (bilateral):   Oathkeeper ←→ Client
                       Direct SLA, bonded capital, defined claim
                       Works with zero market participants

Layer 2 (open market): Believers ←→ Doubters
                       Voluntary staking on outcome
                       Prices operator reliability continuously
                       Neither layer depends on the other to function
```

The SLA works on day one with zero strangers. The market layer adds liquidity, price discovery, and secondary incentives on top. This is architecturally cleaner than any existing commitment mechanism.

### USP 4 — Capital Efficiency via Pooled Bonds

One operator, one bond, many clients. The same 10,000 USDC bond can back multiple simultaneous SLAs with different clients and different breach conditions.

Traditional bonding is one-to-one: lock 10,000 USDC for one contract, capital sits idle. Oathkeeper's model is one-to-many: one bond, multiple registered claims, capital utilization scales with client count.

This mirrors how insurance actually works — and it's how the protocol becomes economically viable for operators at scale.

### USP 5 — Standing as Compounding Asset

Every kept oath contributes to the operator's onchain Standing — a verifiable, permanent, unforgeable track record.

Standing is not a badge or a score. It is infrastructure. In v2, lending protocols read Standing to extend undercollateralized credit. Insurance protocols read Standing to price risk. Copy-trading platforms read Standing to gate allocations.

An operator who keeps 20 oaths over 12 months has built something no marketing can replicate and no competitor can copy — a cryptographically verified history of delivered promises.

### USP 6 — Idle Capital Earns (Vault)

All locked capital — bond, Believer stakes, Doubter stakes — routes to yield-bearing vaults during the epoch. In v1 this is mocked. In v2 this is real Sui money market integration.

The protocol is designed so that capital is never truly idle. Every USDC locked in an oath is working. This improves effective yield for all participants and makes Oathkeeper competitive with simply holding yield-bearing assets.

---

## Who This Is For

| User | Problem Oathkeeper Solves |
|---|---|
| Anonymous AI traders | Need verifiable track record without revealing strategy |
| RPC / infra operators | Need onchain SLA enforcement clients will trust |
| DeFi service providers | Need credible commitments that carry legal-grade weight without legal systems |
| Capital allocators | Need to evaluate pseudonymous operators without trusting their word |
| Believers / Doubters | Need a structured market to express views on operator reliability with skin in the game |
| Lending protocols (v2) | Need Standing data to price undercollateralized credit risk |

---

---

## Core Insight

> One bond per operator. Many SLAs per bond. Open market prices reliability continuously.

The oath is not a single agreement between two parties. It is an operator's standing commitment — a bond posted once, against which multiple clients register claims, and which open market participants price through voluntary staking.

This mirrors how insurance actually works: one insurer, many clients, risk pooled across all of them. Capital efficient by design.

---

## The Five Roles

### 1. Oathkeeper (The Operator)

The party making a verifiable promise. Posts a USDC bond at oath creation. The bond is the enforcement mechanism — no bond, no credible promise.

**Incentive to participate:**
- Gets bond back in full if oath is kept
- Earns 20% of Doubter stakes on kept oath (premium income)
- Builds a verifiable onchain track record (Standing) that compounds over time
- Standing unlocks better terms: lower required bond, higher client trust, undercollateralized credit potential in v2

**What they risk:** Entire bond on breach.

---

### 2. Client (The Counterparty)

The party receiving the service. Already paying for it via subscription, API fees, or service contract — off-chain. Does **not** deposit capital into the oath. Instead, registers a claim amount against the Oathkeeper's bond at oath creation.

**What Client gets:**
- Claim amount paid from bond if oath breaks (onchain recourse, automatic, no arbitration)
- 20% of Believer stakes on broken oath (bonus compensation beyond the SLA claim)
- Service delivered as promised if oath is kept

**What Client risks:** Nothing capital-wise. Their cost is the service subscription they're already paying.

**Why create an SLA here vs a simple escrow:**
- Automatic settlement, no legal process
- Open market (Believers/Doubters) adds liquidity and price discovery around their operator's reliability
- 20% of Believer stakes on breach is upside beyond their base claim

---

### 3. Believer (The Supporter)

Open market participant who backs the Oathkeeper. Stakes voluntarily during the active epoch. No relationship to the Oathkeeper required — purely market-driven.

**Incentive:** Earns proportional share of Doubter stakes (70% pool, distributed pro-rata by stake size) if oath is kept.

**What they risk:** Entire stake if oath breaks, split to Platform/Client/Doubters.

---

### 4. Doubter (The Skeptic)

Open market participant who backs the Client. Stakes voluntarily during the active epoch. Bets the operator will fail.

**Incentive:** Earns proportional share of Believer stakes (70% pool, distributed pro-rata by stake size) if oath breaks.

**What they risk:** Entire stake if oath is kept, split to Platform/Oathkeeper/Believers.

---

### 5. Platform

The protocol itself. Earns from every settlement regardless of outcome. No directional risk.

**Revenue streams:**
1. 10% of loser stakes on every settled oath
2. 10% of vault yield on all locked capital
3. (v2) Minting fee on oath creation for cold-start funding

---

## Economics

### Settlement Split

**If Oath Kept (Oathkeeper delivered):**

| Flow | Amount |
|---|---|
| Bond → Oathkeeper | 100% of bond |
| Client stake → Client | Returned (no capital at risk) |
| Believer stakes → Believers | Returned in full |
| Doubter stakes → Platform | 10% |
| Doubter stakes → Oathkeeper | 20% |
| Doubter stakes → Believers | 70% pro-rata by stake size |
| Vault yield → Platform | 10% |
| Vault yield → Contributors | 90% pro-rata by capital contributed |

**If Oath Broken (Oathkeeper failed):**

| Flow | Amount |
|---|---|
| Client claim → Client | Claim amount from bond |
| Bond residual → Platform | Remainder after client claim |
| Doubter stakes → Doubters | Returned in full |
| Believer stakes → Platform | 10% |
| Believer stakes → Client | 20% |
| Believer stakes → Doubters | 70% pro-rata by stake size |
| Vault yield → Platform | 10% |
| Vault yield → Contributors | 90% pro-rata by capital contributed |

> **Note on bond residual:** If bond (10,000) > client claim (5,000), the remaining 5,000 goes to Platform on breach. This makes breach genuinely punishing for Oathkeeper — they lose more than just the client's claim. This is intentional. The excess acts as a protocol-level penalty for failing to deliver.

---

### Vault Yield Contributors

Vault yield is distributed pro-rata among parties who contributed locked capital:

- Oathkeeper (bond)
- Believers (their stakes)
- Doubters (their stakes)

Client contributes no capital so receives no vault yield. Their upside on breach is the SLA claim + 20% of Believer stakes.

---

### Conservation Proof (Oath Kept Example)

```
Inflows:
  Oathkeeper bond          10,000 USDC
  Believers stakes          2,000 USDC
  Doubters stakes           1,500 USDC
  Vault yield (mocked)        100 USDC
  Total in                 13,600 USDC

Outflows:
  Bond → Oathkeeper        10,000 USDC
  Believers returned        2,000 USDC

  Doubter stakes (1,500):
    Platform 10%              150 USDC
    Oathkeeper 20%            300 USDC
    Believers 70%           1,050 USDC

  Vault yield (100):
    Platform 10%               10 USDC
    Contributors 90%           90 USDC

  Total out                13,600 USDC ✓
```

**Protocol skims zero beyond its explicit 10% fee. Conservation holds.**

---

### Break-Even Probabilities

**Doubter break-even** (stake ratio TBD, using 12.5% example):
- Stake 125 to claim 1,000
- Break-even: breach probability > 11.1%

**Believer break-even** (symmetric):
- Stake to earn from Doubter pool
- Break-even: kept probability > corresponding threshold

**Oathkeeper break-even:**
- Risks bond to earn 20% of Doubter stakes
- Skilled operators with low breach rates profit on premium over time

---

## Capital Efficiency

### The Problem with One Bond Per Client

```
Bond: 10,000 USDC for 1 client with 5,000 USDC claim
Capital utilization: 50%
Capital idle: 5,000 USDC doing nothing
```

This is insurance company logic done wrong.

### The Solution: One Bond, Multiple Clients

```
Bond: 10,000 USDC
Client A claim: 2,000 USDC (uptime SLA)
Client B claim: 3,000 USDC (trading performance SLA)
Client C claim: 2,000 USDC (API availability SLA)
Total registered claims: 7,000 USDC
Buffer: 3,000 USDC
Capital utilization: 70%+ and improving as more clients register
```

One operator serves multiple clients under one bond. This is how insurance actually works. Capital efficiency improves with scale.

**Constraint:** Total registered claims cannot exceed bond value. `sum(client_claims) <= bond_value`. First-come first-served on claim registration.

---

## Vault (Mock in v1)

All locked capital — bond, Believer stakes, Doubter stakes — sits in the Oath object during the epoch. In v1 this is idle. In production this routes to Sui-native money markets (Navi, Scallop) to earn yield while locked.

**v1 implementation:** Mock fixed APY. Auto-allocated on deposit. Yield accrues in the Oath object. Distributed at settlement alongside normal payouts.

**v2 implementation:** Real vault integration with Navi/Scallop. Opt-in per oath at creation (Oathkeeper decides). Vault risk is documented — if the underlying protocol is exploited, locked capital is affected. This risk stays with capital contributors pro-rata.

**Why this matters architecturally:**
> "Idle capital never sits still. Every locked USDC earns while the oath runs. The protocol is designed for capital efficiency at every layer."

---

## State Machine

```
                    Oath Creation (Oathkeeper + Client sign)
                              |
                              v
                          ACTIVE
                         /        \
                        /          \
           mark_breach()            settle_epoch() — all conditions pass
           (mid-epoch)                    |
                |                         v
                v                       KEPT
             BROKEN                      |
                \                        |
                 \                       |
                  v                      v
                      SETTLED (terminal)
```

---

## Multi-Dimensional Breach Conditions

Each client SLA can define its own breach conditions. In v1 (PoC), one set of conditions per oath:

- `max_drawdown_bps` — mid-epoch, permissionless trigger
- `min_trades` — end of epoch
- `min_volume_usdc` — end of epoch
- `min_pnl_bps` — end of epoch

In v2 (multi-client), each client agreement carries its own breach conditions. One client might care about uptime, another about PnL. The operator's bond covers all of them.

---

## PoC Scope (Hackathon v1)

What ships and is demonstrable end-to-end:

| Component | Status |
|---|---|
| Move contracts (6 modules) | Complete — 62 tests passing |
| Single operator, single client SLA | Full flow demonstrable |
| Believer/Doubter staking | Implemented (currently Doubter-only, Believer is additive) |
| 10/20/70 settlement split | Needs contract update |
| Automatic settlement | Complete — permissionless |
| ed25519 exec wallet binding | Complete |
| Scope uniqueness enforcement | Complete |
| Vault yield | Mocked — fixed APY, documented as v2 |
| Multi-client per bond | Documented as v2, conceptually demonstrated in pitch |
| DeepBook trade attestation | In progress (Day 15) |
| Frontend | In progress (Week 4) |
| Mainnet deploy | Scheduled Day 25 (Jun 14) |

---

## v2 Roadmap (Post-Hackathon)

| Feature | Description |
|---|---|
| Multi-client per bond | One Oath object, many registered client SLAs |
| Real vault integration | Navi/Scallop routing, opt-in per oath |
| Standing module onchain | Queryable reputation object per operator |
| Undercollateralized credit | Lending protocols read Standing to extend credit |
| Believer/Doubter reputation | Track record for market participants too |
| Cross-chain operator support | DeepBook + Hyperliquid + other venues |
| Dispute resolution | Full slashing logic, not event-only |

---

## Pitch Framing (DeFi & Payments Track)

**Category:** Onchain SLA infrastructure

**One sentence:** "Oathkeeper lets operators bond capital against service promises, clients register SLA claims against that bond, and open markets price operator reliability in real time — settlement is automatic, deterministic, and requires zero arbitration."

**Why Sui:** Sui's object model handles bonded vaults natively as shared objects. Sub-second finality makes per-trade attestation practical. Native USDC via Wormhole. Permissionless settlement fits Sui's composability model.

**Market fit:**
- Anonymous AI traders need verifiable track records
- RPC operators need onchain SLA enforcement
- DeFi lending protocols need undercollateralized credit infrastructure
- Any operator making a promise needs a mechanism to make it costly to break

**What judges will ask and how to answer:**

| Question | Answer |
|---|---|
| "How is this different from a prediction market?" | Oathkeeper prices individual operator commitments, not world events. The operator authors the claim, bonds against it, and settlement reads their own onchain behavior — not an external oracle. |
| "How is this different from insurance?" | No underwriter taking directional risk. The operator self-bonds. Open market participants price reliability voluntarily. Platform earns fees, not premium-minus-claims. |
| "What's the cold start solution?" | Commissioned SLAs — clients with existing operator relationships bring bilateral agreements onchain. Day one activity doesn't depend on anonymous strangers discovering the protocol. |
| "Why would an operator bond here vs simple escrow?" | Track record. Standing compounds. Over time a verified onchain history of kept oaths unlocks better terms, higher client trust, and eventually undercollateralized credit — none of which a simple escrow provides. |

---

## What to Never Say in the Pitch

- "Prediction market" — structurally different, wrong mental model for judges
- "Insurance protocol" — implies underwriter risk, that's not the model
- "Copy trading" — not what this is
- "AI verifier" — the reconciliation indexer is a deterministic diff, not AI
- "Bet on yourself" — the product is verifiable commitment infrastructure, not speculation

---

*Document version: 2.0*
*Last updated: Day 8, May 27 2026*
*Next review: After contract updates for Believer role and 10/20/70 split*