/**
 * HTTPS Uptime Prober (skeleton — Day 17 fills in the ping + attest loop).
 *
 * Bonded SLA attestation for `UptimeOath`. Pings a target URL on a fixed interval,
 * ed25519-signs each result (target URL + timestamp + status code + latency), and
 * posts the signed result on-chain via `adapter_uptime::record_ping` (Day 17 contract).
 *
 * Trust model: same as the reconciliation indexer. Open-source; anyone can run their
 * own prober for an oath. Multi-prober consensus is v2.
 *
 * Day 1 (this file): boot prints. No real ping loop.
 */

import { log } from '../log.js';

log.info('prober skeleton — ping + sign loop lands Day 17 with adapter_uptime');
