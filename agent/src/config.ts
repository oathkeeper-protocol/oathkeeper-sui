/**
 * Centralized config. Reads .env at module-load time.
 * Throws on missing required vars — fail fast at startup, not mid-loop.
 */
import 'dotenv/config';

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const optional = (key: string, fallback: string): string => process.env[key] ?? fallback;

export const config = {
  sui: {
    network: optional('SUI_NETWORK', 'testnet') as 'testnet' | 'mainnet' | 'devnet',
    rpcUrl: optional('SUI_RPC_URL', 'https://fullnode.testnet.sui.io:443'),
    wsUrl: optional('SUI_WS_URL', 'wss://fullnode.testnet.sui.io:443'),
  },
  oathkeeper: {
    packageId: optional('OATHKEEPER_PACKAGE_ID', '0x0'),
    registryId: optional('OATHKEEPER_REGISTRY_ID', '0x0'),
    lpPoolUsdcId: optional('OATHKEEPER_LP_POOL_USDC_ID', '0x0'),
  },
  walrus: {
    aggregatorUrl: optional(
      'WALRUS_AGGREGATOR_URL',
      'https://aggregator.walrus-testnet.walrus.space',
    ),
    publisherUrl: optional(
      'WALRUS_PUBLISHER_URL',
      'https://publisher.walrus-testnet.walrus.space',
    ),
    epochs: Number(optional('WALRUS_EPOCHS', '10')),
  },
  log: {
    level: optional('LOG_LEVEL', 'info'),
  },
} as const;

export { required, optional };
