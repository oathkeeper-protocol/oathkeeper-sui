/**
 * Settlement economics — the single source of truth for payout math.
 *
 * Split of LOSER stakes (see SplitBps in agent/src/sui/events.ts):
 *   10% Platform · 20% secondary · 70% winners (pro-rata).
 *
 * Secondary beneficiary:
 *   - Kept   -> Oathkeeper (operator), funded from the Doubter pool.
 *   - Broken -> Client (counterparty), funded from the Believer pool.
 *
 * Winner pro-rata INCLUDES the winner's own stake in the denominator, so a
 * staker's payout is: own stake returned + (own / winnerPool) * 70% * loserPool.
 * This is NOT a fixed multiplier.
 */

import { SPLIT } from "./mock";

const platform = SPLIT.platformBps / 10_000; // 0.10
const secondary = SPLIT.secondaryBps / 10_000; // 0.20
const winner = SPLIT.winnerBps / 10_000; // 0.70

export interface PayoutPreview {
  /** What the staker receives if their side wins (stake returned + share). */
  ifWin: number;
  /** What the staker loses if their side loses (their whole stake). */
  ifLose: number;
  /** Just the profit component on a win (ifWin minus the staked amount). */
  winProfit: number;
  /** Implied gross return multiple on a win (ifWin / stake), for context only. */
  winMultiple: number;
}

/**
 * Derived payout preview for a prospective stake.
 *
 * @param side          "Believer" or "Doubter"
 * @param stake         capital the user intends to add
 * @param believerPool  current total Believer stakes (BEFORE this stake)
 * @param doubterPool   current total Doubter stakes (BEFORE this stake)
 */
export function previewStake(
  side: "Believer" | "Doubter",
  stake: number,
  believerPool: number,
  doubterPool: number,
): PayoutPreview {
  const safeStake = Math.max(0, stake);

  // Winning side gets its pool grown by `stake`; the opposing pool is the loser.
  const myPoolAfter =
    (side === "Believer" ? believerPool : doubterPool) + safeStake;
  const loserPool = side === "Believer" ? doubterPool : believerPool;

  const share =
    myPoolAfter > 0 ? (safeStake / myPoolAfter) * winner * loserPool : 0;
  const ifWin = safeStake + share;

  return {
    ifWin,
    ifLose: safeStake,
    winProfit: share,
    winMultiple: safeStake > 0 ? ifWin / safeStake : 0,
  };
}

/** Full settlement distribution for a Kept outcome. Conservation-balanced. */
export interface SettlementFlow {
  /** Outcome label. */
  outcome: "Kept" | "Broken";
  /** Bond is returned to the operator (Kept) or paid out (Broken). */
  bondToPromiser: number;
  bondToClient: number;
  bondResidualToPlatform: number;
  /** Loser pool is split across these three. */
  loserPool: number;
  loserToPlatform: number;
  loserToSecondary: number;
  loserToWinners: number;
  /** The pool that is simply returned to its stakers (the winning side). */
  winnerPoolReturned: number;
  /** Total capital entering settlement (bond + both pools). */
  totalIn: number;
  /** Total capital leaving settlement. Equals totalIn when conservation holds. */
  totalOut: number;
}

/**
 * Compute the full settlement flow for an oath outcome.
 *
 * Kept:   bond -> operator; Doubter pool (loser) split 10/20/70 to
 *         Platform / operator / Believers; Believer pool returned.
 * Broken: bond -> Client (claim) + Platform (residual); Believer pool (loser)
 *         split 10/20/70 to Platform / Client / Doubters; Doubter pool returned.
 */
export function settlementFlow(
  outcome: "Kept" | "Broken",
  bondAmount: number,
  clientClaim: number,
  believerPool: number,
  doubterPool: number,
): SettlementFlow {
  if (outcome === "Kept") {
    const loserPool = doubterPool;
    const loserToPlatform = loserPool * platform;
    const loserToSecondary = loserPool * secondary; // -> operator
    const loserToWinners = loserPool * winner; // -> believers
    const totalIn = bondAmount + believerPool + doubterPool;
    const totalOut =
      bondAmount + // bond back to operator
      believerPool + // believer pool returned
      loserToPlatform +
      loserToSecondary +
      loserToWinners;
    return {
      outcome,
      bondToPromiser: bondAmount,
      bondToClient: 0,
      bondResidualToPlatform: 0,
      loserPool,
      loserToPlatform,
      loserToSecondary,
      loserToWinners,
      winnerPoolReturned: believerPool,
      totalIn,
      totalOut,
    };
  }

  // Broken
  const loserPool = believerPool;
  const loserToPlatform = loserPool * platform;
  const loserToSecondary = loserPool * secondary; // -> client
  const loserToWinners = loserPool * winner; // -> doubters
  const bondToClient = Math.min(clientClaim, bondAmount);
  const bondResidualToPlatform = Math.max(0, bondAmount - bondToClient);
  const totalIn = bondAmount + believerPool + doubterPool;
  const totalOut =
    bondToClient +
    bondResidualToPlatform +
    doubterPool + // doubter pool returned
    loserToPlatform +
    loserToSecondary +
    loserToWinners;
  return {
    outcome,
    bondToPromiser: 0,
    bondToClient,
    bondResidualToPlatform,
    loserPool,
    loserToPlatform,
    loserToSecondary,
    loserToWinners,
    winnerPoolReturned: doubterPool,
    totalIn,
    totalOut,
  };
}
