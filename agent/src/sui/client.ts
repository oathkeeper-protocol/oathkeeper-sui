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
  deepbookPackageId: process.env.DEEPBOOK_PACKAGE_ID ?? '0x74cd5657843c627f3d80f713b71e9f895bbbeb470956d8a8e1185badf6cc77c8',
  deepbookRegistryId: process.env.DEEPBOOK_REGISTRY_ID ?? '0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1',
  deepTreasuryId: process.env.DEEP_TREASURY_ID ?? '0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb',
  deepType: process.env.DEEP_TYPE ?? '0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP',
  dbusdcType: process.env.DBUSDC_TYPE ?? '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC',
  deepSuiPoolId: process.env.DEEP_SUI_POOL_ID ?? '0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f',
  suiDbusdcPoolId: process.env.SUI_DBUSDC_POOL_ID ?? '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5',
  deepbookBalanceManagerId: process.env.DEEPBOOK_BALANCE_MANAGER_ID ?? '0x0',
  deepbookTradeCapId: process.env.DEEPBOOK_TRADE_CAP_ID ?? '0x0',
  deepbookDepositCapId: process.env.DEEPBOOK_DEPOSIT_CAP_ID ?? '0x0',
  deepbookWithdrawCapId: process.env.DEEPBOOK_WITHDRAW_CAP_ID ?? '0x0',
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
