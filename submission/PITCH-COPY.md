# Pitch Copy — Oathkeeper

> Master source of truth for slide text, README hero, and landing-page copy.
> The DEMO-SCRIPT.md opens trader-specific (trading is the wedge / depth pitch);
> the deck and README open universal (commitment market is the category).

## Category-level claim (one sentence)

> **Oathkeeper sells verifiable opacity** — the ability to make a private claim publicly costly to fake.

## The dilemma (universal, fits all 5 verticals)

Every operator with private edge faces the same broken choice.

### 01. Show the work.
**→ Edge decays on contact.**

The moment your strategy, your infrastructure config, your model's reasoning, your validator setup is legible, it's copied, front-run, or commoditized. **Transparency taxes the skilled.**

### 02. Hide the work.
**→ Your claims become illegible.**

"47% win rate." "99.95% uptime." "The model never hallucinates." All three carry the same signal weight as outright fraud. Capital cannot separate skill from luck, real from staged, edge from theatre. **Opacity taxes the honest.**

### 03. Bond the outcome.
**→ Both halves resolve.**

Don't reveal the work. Don't ask the market for trust. Stake the result.

What gets revealed is the commitment — sealed, verified, expensive to break. The mechanism stays private; the outcome is public, attested, and bonded.

**Verifiable opacity.**

## How each vertical maps onto the dilemma

| Vertical | "The work" (stays hidden) | "The outcome" (gets bonded) | v1 status |
|----------|---------------------------|------------------------------|-----------|
| **TradingOath** | Strategy, signals, sizing | Max drawdown, min trades, min PnL, min volume | Shipped (DeepBook + HL) |
| **UptimeOath** | Infra, SOPs, monitoring | Uptime %, min prober pings | Shipped (prober adapter) |
| **BehaviorOath** | Model weights, prompts, RLHF | Behavior score × N judgments | Shipped (mock judge) |
| **ValidatorOath** | Config, deployment, ops | Uptime, slash-rate | Enum-only (roadmap) |
| **TreasuryOath** | Positions, hedges, rebalances | Net yield, max drawdown | Enum-only (roadmap) |

Every row shares the same shape: *the mechanism stays private; the outcome is bonded and verified.* Three shipped, two in the type system — and the protocol does not care which is which. That's the category-level claim.

## Three roles, in one sentence each

- **Oathkeeper** posts a bond and a sealed commitment. Earns Standing on success, loses the bond on breach.
- **Doubter** stakes against an oath they believe will break. Wins from the bond on breach, forfeits the stake on success.
- **LP** underwrites the pool with idle capital. Earns from premium splits and breach residuals.

## Why Oathkeepers play despite asymmetric payoff

The maximum upside on any single oath is small (premium ≈ 7.5% of bond if fully doubted). The maximum downside is the entire bond. This is option-writing shape — and it is correct by design.

**Standing is the product the Oathkeeper is buying with the bond.** Premium income is a rebate, not the goal. An anonymous AI trader has no other way to convert private edge into a portable, verifiable, copyable-by-allocator track record. The bond is the marketing budget. The premium covers part of it.

Symmetric payoffs would dilute the Standing signal until it carried no information. The asymmetry is what makes the signal valuable.

## The category framing

Oathkeeper is not a prediction market. It is not an insurance protocol. It is not a copy-trading platform.

**Oathkeeper is a substrate for commitment markets.** Anywhere an opaque actor needs to make a credible claim about their own future behavior, an oath can be minted, bonded, doubted, and settled — with the mechanism staying private and the outcome being on-chain provable.

Trading is the wedge. Uptime is the proof of generalization. Behavior is the next unlock. Validators and treasuries are the long tail.

## Closing line (deck final slide)

> **Oathkeeper. The commitment-market substrate.**
> *Verifiable opacity, bonded on Sui.*
