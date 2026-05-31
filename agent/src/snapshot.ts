/**
 * Read all on-chain oaths from testnet and write a view-model snapshot the frontend
 * consumes, so the marketplace shows REAL data without a live RPC round-trip per render.
 *
 * Queries OathMinted events -> oath ids -> multiGetObjects(showContent) -> maps the Move
 * struct to the frontend Oath view-model shape -> writes frontend/src/lib/onchain-snapshot.json.
 *
 * Run after seeding: bunx tsx src/snapshot.ts
 */
import { writeFileSync } from 'node:fs';
import { makeClient, env, usdcType } from './sui/client.js';
import { log } from './log.js';

const OUT = new URL('../../frontend/src/lib/onchain-snapshot.json', import.meta.url).pathname;
const EXPLORER = 'https://suiscan.xyz/testnet/object/';

const STATUS = ['Active', 'Kept', 'Broken', 'Settled'] as const;
const BREACH = ['Drawdown', 'MinTrades', 'MinPnl', 'MinVolume'] as const;

function bytesToAscii(arr: number[]): string {
  return Buffer.from(arr).toString('utf8');
}
function alias(addr: string): string {
  return 'OP-' + addr.slice(2, 6).toUpperCase();
}
function prose(dims: any, assets: string[]): string {
  const dd = (Number(dims.max_drawdown_bps) / 100).toFixed(0);
  const parts = ['Holds drawdown at or under ' + dd + '%', 'at least ' + dims.min_trades + ' trades'];
  if (Number(dims.min_pnl_bps) > 0) parts.push('at least ' + (Number(dims.min_pnl_bps) / 100).toFixed(0) + '% net PnL');
  return parts.join(', ') + ' on ' + assets.join('/') + ' this epoch.';
}

async function main() {
  if (env.packageId === '0x0') throw new Error('deploy first; set env');
  const client = makeClient();

  // 1. Collect oath ids from OathMinted events (paginated).
  const ids: string[] = [];
  let cursor: any = null;
  do {
    const page = await client.queryEvents({
      query: { MoveEventType: env.packageId + '::oath::OathMinted' },
      cursor: cursor ?? undefined, limit: 50, order: 'ascending',
    });
    for (const e of page.data) ids.push((e.parsedJson as any).oath_id);
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);
  log.info({ count: ids.length }, 'OathMinted events found');

  // 2. Read objects + map. Filter to our USDC coin type and to currently-existing objects.
  const oaths: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const objs = await client.multiGetObjects({ ids: batch, options: { showContent: true, showType: true } });
    for (const o of objs) {
      const content: any = (o.data as any)?.content;
      if (!content || content.dataType !== 'moveObject') continue;
      if (!String(content.type).includes('::oath::Oath<')) continue;
      const f = content.fields;
      const assets = (f.scope.fields.allowed_assets as number[][]).map(bytesToAscii);
      const statusNum = Number(f.status);
      const believer = Number(f.total_believer_stakes ?? f.believer_pool);
      const doubter = Number(f.total_doubter_stakes ?? f.doubter_pool);
      oaths.push({
        oathId: f.id.id,
        promiser: f.promiser,
        promiserAlias: alias(f.promiser),
        client: f.client,
        oathType: f.oath_type.variant,
        bondAmount: Number(f.bond),
        clientClaim: Number(f.client_claim),
        clientClaimText: prose(f.dims.fields, assets),
        dims: {
          maxDrawdownBps: Number(f.dims.fields.max_drawdown_bps),
          minTrades: Number(f.dims.fields.min_trades),
          minPnlBps: Number(f.dims.fields.min_pnl_bps),
          minVolumeUsdc: Number(f.dims.fields.min_volume_usdc),
        },
        totalBelieverStakes: believer,
        totalDoubterStakes: doubter,
        currentEquity: Number(f.current_equity_usdc),
        startingEquity: Number(f.starting_equity_usdc),
        tradeCount: Number(f.trade_count),
        cumulativeVolume: Number(f.cumulative_volume_usdc),
        epochEndMs: Number(f.epoch_end_ms),
        status: STATUS[statusNum] ?? 'Active',
        breachReason: f.breach_reason == null ? undefined : BREACH[Number(f.breach_reason)],
        standing: { kept: 0, broken: 0 },
        assets,
        attestations: [],
        onchain: true,
        explorerUrl: EXPLORER + f.id.id,
      });
    }
  }

  // Newest first (Active before resolved for the grid).
  oaths.sort((a, b) => b.epochEndMs - a.epochEndMs);

  const snapshot = {
    network: env.network,
    packageId: env.packageId,
    coinType: usdcType(),
    oaths,
  };
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
  log.info({ out: OUT, oaths: oaths.length }, 'SNAPSHOT WRITTEN');
}

main().catch((e) => { log.error({ err: String(e?.message ?? e) }, 'SNAPSHOT FAILED'); process.exit(1); });
