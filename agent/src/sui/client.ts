/**
 * Sui client + keypair helpers + deployed-object config for Oathkeeper integration.
 *
 * All ids come from env (set after `sui client publish` — see scripts/deploy notes).
 * Network defaults to testnet (persistent, per the deploy decision).
 */
import 'dotenv/config';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export const CLOCK_ID = '0x6';

export const env = {
  network: (process.env.SUI_NETWORK ?? 'testnet') as 'testnet' | 'devnet' | 'mainnet',
  rpcUrl: process.env.SUI_RPC_URL ?? 'https://fullnode.testnet.sui.io:443',
  packageId: process.env.OATHKEEPER_PACKAGE_ID ?? '0x0',
  registryId: process.env.OATHKEEPER_REGISTRY_ID ?? '0x0',
  usdcTreasuryId: process.env.OATHKEEPER_USDC_TREASURY_ID ?? '0x0',
  deployerKey: process.env.OATHKEEPER_DEPLOYER_KEY ?? '',
};

/** Fully-qualified mock-USDC coin type, used as the generic `T` everywhere. */
export function usdcType(): string {
  return `${env.packageId}::usdc::USDC`;
}

export function makeClient(): SuiJsonRpcClient {
  return new SuiJsonRpcClient({ url: env.rpcUrl, network: env.network });
}

/** Load a keypair from a suiprivkey1... bech32 string. */
export function keypairFromBech32(privkey: string): Ed25519Keypair {
  return Ed25519Keypair.fromSecretKey(privkey);
}

/** The deployer / platform_treasury / funding-source keypair (from env). */
export function deployerKeypair(): Ed25519Keypair {
  if (!env.deployerKey) throw new Error('Set OATHKEEPER_DEPLOYER_KEY (suiprivkey1...) in agent/.env');
  return keypairFromBech32(env.deployerKey);
}

/** Sum of mock-USDC coin balances owned by `address`. Returns bigint. */
export async function usdcBalance(client: SuiJsonRpcClient, address: string): Promise<bigint> {
  const { totalBalance } = await client.getBalance({ owner: address, coinType: usdcType() });
  return BigInt(totalBalance);
}

/** ASCII string -> number[] for vector<u8> args (asset symbols, blob roots). */
export function bytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}
