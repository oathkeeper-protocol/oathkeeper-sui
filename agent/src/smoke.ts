/**
 * Smoke test — hits Sui testnet RPC, confirms the SDK is wired correctly.
 * Run with: `pnpm smoke`
 *
 * Expected output on success:
 *   ✓ chain identifier: <hex>
 *   ✓ checkpoint #<number>
 *   ✓ reference gas price: <mist>
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { config } from './config.js';
import { log } from './log.js';

async function main() {
  log.info({ rpc: config.sui.rpcUrl, network: config.sui.network }, 'smoke: connecting');

  const client = new SuiJsonRpcClient({
    url: config.sui.rpcUrl,
    network: config.sui.network,
  });

  const chainId = await client.getChainIdentifier();
  log.info({ chainId }, 'smoke: chain identifier OK');

  const checkpoint = await client.getLatestCheckpointSequenceNumber();
  log.info({ checkpoint }, 'smoke: latest checkpoint OK');

  const gas = await client.getReferenceGasPrice();
  log.info({ gas: gas.toString() }, 'smoke: reference gas price OK');

  log.info('smoke: all checks passed');
}

main().catch((err) => {
  log.error({ err }, 'smoke FAILED');
  process.exit(1);
});
