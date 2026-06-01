/**
 * Deployed Oathkeeper testnet addresses. Public ids — safe to commit.
 * Regenerate after any redeploy (see agent/.env). Keep in sync with onchain-snapshot.json.
 */
export const CHAIN = {
  network: "testnet" as const,
  packageId: "0xae9da7ca311e9388995875ee5e557b270e2fae4d6f993555daa67042575598f9",
  registryId: "0x670b6d6e19fddcf7cf2d0877b8efb7b082be4a6a6c0f1cc3876a7ab238cd8838",
  usdcTreasuryId: "0x44c876716bfc74fc1d8be5b15731c4c78f099fc2efd77fba77428c94c1b8aae5",
  clockId: "0x6",
};

export const USDC_TYPE = `${CHAIN.packageId}::usdc::USDC`;

export const explorerObject = (id: string) => `https://suiscan.xyz/testnet/object/${id}`;
export const explorerTx = (digest: string) => `https://suiscan.xyz/testnet/tx/${digest}`;
