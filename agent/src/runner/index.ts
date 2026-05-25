/**
 * Strategy Agent Runner (skeleton — Day 18-19 fills in archetypes + DeepBook integration).
 *
 * Wires the bound exec wallet to DeepBook V3 spot. Each fill that lands is attested
 * via `attestation::record_trade` so the on-chain oath state stays current.
 *
 * Archetypes to port from 0G `hackathons/hackquest-0g/agent/src/v3/`:
 *   - sharp  : tight stops, frequent trades, low PnL target
 *   - bold   : wide stops, few trades, high PnL target
 *   - patient: long hold times, low frequency
 *   - stoic  : minimal trades, focus on volume floor
 *
 * Each archetype is one entry function that takes (oathId, deepbookClient,
 * execKeypair) and runs the strategy loop until epoch_end or mark_breach.
 *
 * Day 1 (this file): boot prints. No real strategy logic.
 */

import { log } from '../log.js';
import { config } from '../config.js';

log.info(
  { network: config.sui.network, packageId: config.oathkeeper.packageId },
  'runner skeleton — strategy archetypes land Day 18-19',
);
