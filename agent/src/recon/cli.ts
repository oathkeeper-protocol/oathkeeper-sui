/**
 * Oathkeeper reconciliation CLI — the open-source, deterministic verifier.
 *
 *   pnpm reconcile <oathId>                 # verify an oath's attestations against its venue
 *   pnpm reconcile <oathId> --fixture f.json # diff against a fixture venue record (demo)
 *   pnpm reconcile <oathId> --dispute        # file on-chain disputes for unbacked fills
 *
 * Anyone can run this. It reads the oath's bound exec wallet + venue, pulls every
 * `TradeAttested` event the operator emitted, fetches the venue's authoritative fill record,
 * and prints a verdict. A 'discrepancies' verdict is a PROOF (deterministic, reproducible)
 * that the operator attested fills that never happened — the catch-the-liar moment.
 *
 * Fixture format (JSON): [{ "venueTxHash": "...", "asset": "BTC", "notional": "1000", "timestampMs": 1 }]
 */
import { readFileSync } from 'node:fs';
import { makeClient, env, deployerKeypair } from '../sui/client.js';
import { buildDisputePtb } from '../sui/ptb.js';
import { reconcile, attestedFillFromEvent } from './reconcile.js';
import { DeepBookVenueSource, FixtureVenueSource, UnverifiableVenueSource, type VenueSource } from './venue.js';
import type { AttestedFill, VenueFill } from './types.js';
import { log } from '../log.js';

const VENUE_NAMES: Record<number, string> = { 0: 'deepbook', 1: 'hyperliquid' };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

interface OathView {
  execAddr: string;
  venueCode: number;
  status: number;
}

async function readOath(client: ReturnType<typeof makeClient>, oathId: string): Promise<OathView> {
  const obj = await client.getObject({ id: oathId, options: { showContent: true } });
  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') throw new Error(`oath ${oathId} not found / not a Move object`);
  const fields = content.fields as Record<string, any>;
  const scope = fields.scope?.fields ?? {};
  return {
    execAddr: scope.exec_addr as string,
    venueCode: Number(scope.venue),
    status: Number(fields.status),
  };
}

async function readAttestedFills(
  client: ReturnType<typeof makeClient>,
  oathId: string,
): Promise<AttestedFill[]> {
  const fullType = `${env.packageId}::attestation::TradeAttested`;
  const fills: AttestedFill[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  for (let page = 0; page < 50; page++) {
    const res = await client.queryEvents({
      query: { MoveEventType: fullType },
      cursor: cursor ?? undefined,
      limit: 50,
      order: 'ascending',
    });
    for (const e of res.data) {
      const j = e.parsedJson as any;
      if (j?.oath_id === oathId) fills.push(attestedFillFromEvent(oathId, j));
    }
    if (!res.hasNextPage || !res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return fills;
}

function loadFixture(path: string): VenueFill[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as any[];
  return raw.map((r) => ({
    venueTxHash: String(r.venueTxHash),
    asset: String(r.asset ?? ''),
    notional: BigInt(r.notional ?? 0),
    timestampMs: Number(r.timestampMs ?? 0),
  }));
}

async function main() {
  const oathId = process.argv[2];
  if (!oathId || oathId.startsWith('--')) {
    console.error('usage: pnpm reconcile <oathId> [--fixture file.json] [--dispute]');
    process.exit(1);
  }
  if (env.packageId === '0x0') throw new Error('Set OATHKEEPER_PACKAGE_ID in agent/.env');
  const client = makeClient();

  const oath = await readOath(client, oathId);
  const venueName = VENUE_NAMES[oath.venueCode] ?? `venue#${oath.venueCode}`;
  const attested = await readAttestedFills(client, oathId);

  // Pick the venue source.
  const fixturePath = arg('--fixture');
  let source: VenueSource;
  if (fixturePath) {
    source = new FixtureVenueSource(loadFixture(fixturePath));
  } else if (oath.venueCode === 0) {
    source = new DeepBookVenueSource(client, process.env.DEEPBOOK_PACKAGE_ID ?? arg('--deepbook-pkg'));
  } else {
    source = new UnverifiableVenueSource(venueName);
  }

  const venueFills = await source.fills(oath.execAddr);
  const report = reconcile(oathId, attested, venueFills, {
    authoritative: source.authoritative,
    venue: venueName,
    existenceOnly: source.existenceOnly,
  });

  // --- Print verdict ---
  const line = '─'.repeat(64);
  console.log(line);
  console.log(`RECONCILIATION  oath ${oathId}`);
  console.log(`venue=${venueName}  source=${source.name}  authoritative=${source.authoritative}`);
  console.log(`attested fills: ${report.attestedCount}   venue fills: ${report.venueCount}   matched: ${report.matched}   disputable=${report.disputable}`);
  console.log(line);
  if (report.verdict === 'clean') {
    console.log('VERDICT: ✓ CLEAN — every attested fill is backed by a real venue fill.');
  } else if (report.verdict === 'unverifiable') {
    console.log(`VERDICT: ? UNVERIFIABLE — no authoritative source for ${venueName}.`);
    console.log('  (Hyperliquid/off-chain venues need the HL API or a Nautilus/zkTLS attestation — roadmap.)');
  } else {
    console.log('VERDICT: ✗ DISCREPANCIES — operator attested fills with no on-chain backing:');
  }
  for (const f of report.findings) {
    const mark = report.verdict === 'unverifiable' || f.kind === 'missing' ? '·' : '!';
    const label = report.verdict === 'unverifiable' && f.kind !== 'missing' ? 'unverified' : f.kind;
    console.log(`  [${mark} ${label}] ${f.detail}`);
  }
  console.log(line);

  // --- Optional: file disputes on-chain for substantiated findings ---
  if (hasFlag('--dispute')) {
    const disputable = report.findings.filter((f) => f.kind === 'fabricated' || f.kind === 'mismatch');
    if (!report.disputable) {
      console.log('nothing disputable — no substantiated fabricated/mismatched fills from an authoritative venue source.');
    } else if (!env.deployerKey) {
      console.log(`${disputable.length} disputable finding(s), but OATHKEEPER_DEPLOYER_KEY is unset — skipping submission.`);
    } else {
      const signer = deployerKeypair();
      for (const f of disputable) {
        const tx = buildDisputePtb(oathId, f.venueTxHash, `recon:${f.kind}`);
        const res = await client.signAndExecuteTransaction({ transaction: tx, signer, options: { showEffects: true } });
        await client.waitForTransaction({ digest: res.digest });
        console.log(`  filed dispute for ${f.venueTxHash} -> ${res.digest}`);
      }
    }
  }

  process.exitCode = report.verdict === 'discrepancies' ? 2 : 0;
}

main().catch((e) => {
  log.error({ err: String(e?.message ?? e) }, 'reconcile failed');
  process.exit(1);
});
