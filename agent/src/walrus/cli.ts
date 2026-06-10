/**
 * Walrus SLA-doc CLI — store/read a per-oath agreement document on Walrus testnet.
 *
 *   pnpm walrus:store "I commit to <20% drawdown across >=10 trades this epoch."
 *   pnpm walrus:read <blobId>
 *   pnpm walrus:demo            # store a sample SLA doc, read it back, assert round-trip
 *
 * No wallet/gas needed on testnet (public publisher). The printed blobId is what you commit
 * on-chain as the Oath's sealed_oath_text_root.
 */
import { storeBlob, readBlob } from './store.js';
import { log } from '../log.js';

const SAMPLE_SLA = `OATHKEEPER SLA — Trading Oath
Operator commits, for this epoch, to:
  - max drawdown <= 20% of starting equity
  - >= 10 attested fills
  - net PnL >= +5%
Bond: 10,000 USDC. Client claim: 5,000 USDC.
Venue: DeepBook. Assets: BTC, ETH.
This document is the human-readable rendering of the on-chain dimensions; the blobId is
committed on-chain (sealed_oath_text_root) so the agreement is integrity-bound and auditable.`;

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'store') {
    const text = process.argv.slice(3).join(' ');
    if (!text) throw new Error('usage: pnpm walrus:store "<sla text>"');
    const r = await storeBlob(text);
    console.log(`blobId:  ${r.blobId}`);
    console.log(`state:   ${r.state}${r.endEpoch ? `  (paid through epoch ${r.endEpoch})` : ''}`);
    console.log(`read:    ${r.readUrl}`);
    console.log(`\nCommit this blobId on-chain as the Oath's sealed_oath_text_root.`);
    return;
  }

  if (cmd === 'read') {
    const blobId = process.argv[3];
    if (!blobId) throw new Error('usage: pnpm walrus:read <blobId>');
    console.log(await readBlob(blobId));
    return;
  }

  // default / 'demo': round-trip a sample SLA doc and assert integrity.
  log.info('storing sample SLA doc on Walrus testnet (public publisher, no wallet/gas)...');
  const r = await storeBlob(SAMPLE_SLA);
  log.info({ blobId: r.blobId, state: r.state, readUrl: r.readUrl }, 'stored');
  const back = await readBlob(r.blobId);
  if (back.trim() !== SAMPLE_SLA.trim()) {
    throw new Error('ROUND-TRIP FAILED: read content does not match what was stored');
  }
  log.info('✓ round-trip verified — stored and read back identical bytes from Walrus testnet');
  console.log(`\nblobId (commit as sealed_oath_text_root): ${r.blobId}`);
}

main().catch((e) => {
  log.error({ err: String(e?.message ?? e) }, 'walrus cli failed');
  process.exit(1);
});
