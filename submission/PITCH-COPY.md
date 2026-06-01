# Pitch Copy -- Oathkeeper

> Master source of truth for slide text, README hero, and landing-page copy.
> The DEMO-SCRIPT.md opens trader-specific (trading is the wedge / depth pitch);
> the deck and README open universal (commitment market is the category).

## What Oathkeeper is (one sentence, DeFi and Payments framing)

> **Oathkeeper is a programmable conditional-settlement layer** -- bonded capital that moves automatically and atomically when an on-chain condition is verified, with zero arbitration and no trusted intermediary.

This is a **bonded-SLA payment rail.** An operator locks USDC into an oath, a client registers a claim against that bond, and open markets price the operator's reliability in real time. When the epoch closes, settlement routes capital to all five roles in one permissionless transaction. The operator cannot be slow-walked. The client cannot be ignored. The platform takes a disclosed 10% fee and the sum is provably zero.

This belongs on the DeFi and Payments track because it is not a trading app wearing DeFi clothes. It is programmable money: capital held under conditional logic, released by on-chain state, distributed across multiple counterparties in one atomic move. It hits the track idea-bank directly -- trust-minimized finance, conditional execution, automated enforcement, and a novel commitment-market structure that prediction markets cannot build.

## The dilemma (universal, fits all verticals)

Every operator with private edge faces the same broken choice.

### 01. Show the work.

**Edge decays on contact.**

The moment your strategy, your infrastructure config, your model's reasoning, your validator setup is legible, it is copied, front-run, or commoditized. Transparency taxes the skilled.

### 02. Hide the work.

**Your claims become illegible.**

"47% win rate." "99.95% uptime." "The model never hallucinates." All three carry the same signal weight as outright fraud. Capital cannot separate skill from luck, real from staged, edge from theatre. Opacity taxes the honest.

### 03. Bond the outcome.

**Both halves resolve.**

Don't reveal the work. Don't ask the market for trust. Stake the result.

What gets revealed is the commitment -- sealed, verified, expensive to break. The mechanism stays private; the outcome is public, attested, and bonded.

**Verifiable opacity.** Inside a programmable payment rail.

## The five roles (correct, matches shipped contracts)

- **Oathkeeper** posts a USDC bond and a sealed commitment. Gets the bond back plus 20% of Doubter stakes on a Kept oath. Loses the bond on breach. Builds Standing with every kept oath.
- **Client** registers an SLA claim against the bond at oath creation. Pays no capital. Gets the claim paid from the bond on breach, plus 20% of Believer stakes as bonus compensation. Gets zero on a Kept oath -- they got the service.
- **Believer** stakes FOR the Oathkeeper voluntarily during the active epoch. Earns a pro-rata share of 70% of Doubter stakes on Kept. Loses the full stake on Broken.
- **Doubter** stakes AGAINST the Oathkeeper voluntarily during the active epoch. Earns a pro-rata share of 70% of Believer stakes on Broken. Loses the full stake on Kept.
- **Platform** earns 10% of the loser stakes on every settled oath, regardless of outcome. No directional risk. The fee is explicit, disclosed, and counted in the conservation proof.

## Settlement split (10 / 20 / 70 -- verified on testnet)

**Kept oath** (Doubters lose):

Doubter stakes split: 10% Platform, 20% Oathkeeper, 70% to winner pool (Believers). Bond returns in full to Oathkeeper.

Testnet example: bond 10000 + believers 2000 + doubters 1500. Oathkeeper +300, believer +1050, doubter -1500, platform +150, client 0. Net = 0.

**Broken oath** (Believers lose):

Bond: client_claim to Client, residual to Platform. Believer stakes split: 10% Platform, 20% Client, 70% to winner pool (Doubters).

Testnet example: same inputs. Oathkeeper -10000, believer -2000, doubter +1400, platform +5200, client +5400. Net = 0.

Conservation: total USDC in equals total USDC out across all five roles. Verified live on Sui testnet for both Kept and Broken outcomes. The Platform's 10% is an explicit outflow, not a silent skim. Total in = total out.

## Why the 10% Platform fee is a strength, not a weakness

The fee is disclosed in the contract, counted in the on-chain conservation check, and consistent across every oath. It is not a hidden spread, not a dynamic fee, not a governance parameter that can be changed without a contract upgrade. Judges can verify it on-chain right now.

Protocols that claim zero fees hide their extraction in spreads, timing, or opaque pool mechanisms. Oathkeeper does the opposite: one number, one line in `economics.move`, provably consistent.

## Why PTBs are the right Sui primitive here

The oath mint is a single Programmable Transaction Block: `new_dimensions` + `new_scope` + `start_epoch` (which returns a zero-ability `ScopeReservation` hot potato) + `bind_exec_wallet`. The hot potato enforces atomicity at the type-system level. If `bind_exec_wallet` is not called in the same PTB, the transaction fails to compile. There is no lock-acquire-then-fail window. There is no reentrancy surface. This is not a clever use of PTBs -- it is exactly what PTBs exist for. It is a top-tier composability signal on this track.

## The vertical table (honest depth)

| Vertical | The work (stays hidden) | The outcome (gets bonded) | v1 status |
|----------|------------------------|--------------------------|-----------|
| **TradingOath** | Strategy, signals, sizing | Max drawdown, min trades, min PnL, min volume | Shipped (full attestation via exec wallet) |
| **UptimeOath** | Infra, SOPs, monitoring | Uptime %, min prober pings | Enum + mint-gate only (roadmap) |
| **BehaviorOath** | Model weights, prompts, RLHF | Behavior score x N judgments | Enum + mint-gate only (roadmap) |
| **ValidatorOath** | Config, deployment, ops | Uptime, slash-rate | Enum-only, rejected at mint (roadmap) |
| **TreasuryOath** | Positions, hedges, rebalances | Net yield, max drawdown | Enum-only, rejected at mint (roadmap) |

Trading is fully shipped end-to-end. Uptime and Behavior accept mints (the enum is in the type system, the mint gate passes), but neither has an attestation adapter in v1. Adding an adapter per vertical is a single-PR change, not a re-architecture. That is the category proof even before the adapters land.

Every row shares the same shape: the mechanism stays private; the outcome is bonded and verified. One protocol, five verticals, one type of oath.

## The category framing

Oathkeeper is not a prediction market. Prediction markets price world-observable events. They cannot price individual-actor commitments: the subject is not a market participant, has no bond at risk, and cannot author the claim's shape.

Oathkeeper is not an insurance protocol. There is no party taking directional risk on behalf of others. The operator self-bonds. The platform earns a disclosed fee, not premium-minus-claims.

**Oathkeeper is a substrate for commitment markets.** Anywhere an opaque actor needs to make a credible claim about their own future behavior, an oath can be minted, bonded, staked against, and settled -- with the mechanism staying private and the outcome being on-chain provable.

Trading is the wedge. The 10/20/70 split, the conservation proof, and the atomic PTB mint are the technical depth. The vertical enum is the proof of category. Validators and treasuries are the long tail.

## Closing line (deck final slide)

> **Oathkeeper. Programmable conditional settlement for any bonded commitment.**
> Verifiable opacity, on Sui testnet now.
