/**
 * Deployed Oathkeeper testnet addresses. Public ids — safe to commit.
 * Regenerate after any redeploy (see agent/.env). Keep in sync with onchain-snapshot.json.
 */
export const CHAIN = {
  network: "testnet" as const,
  packageId: "0xa4c2f835f0abf70cf6ba095d7244a1ca8c8a1df7189b6a692517e32727ee267d",
  registryId: "0xa54b3b038d77ebb0228f90e7661ced9a25e65c8fc18d730315e32c1f8ce1f2f9",
  usdcTreasuryId: "0xb9c24ef76fd4ec9b571f6c67e8bed2e65c01a59609ca424b88f23ca1802ae43c",
  clockId: "0x6",
};

export const USDC_TYPE = `${CHAIN.packageId}::usdc::USDC`;

export const explorerObject = (id: string) => `https://suiscan.xyz/testnet/object/${id}`;
export const explorerTx = (digest: string) => `https://suiscan.xyz/testnet/tx/${digest}`;
