/**
 * Live on-chain reads for the connected wallet + the marketplace.
 *
 * Maps Move objects/events to the same Oath view-model shape as lib/mock.ts, so the
 * screens render real testnet state. Used client-side via dapp-kit's useSuiClient inside
 * @tanstack/react-query, so actions (mint/stake) reflect after a refetch.
 *
 * The on-chain Oath content shape (verified): Balance fields render as value strings;
 * dims/scope are nested `.fields`; oath_type is `{ variant }`; assets are byte arrays.
 */
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
/** Alias so call sites that pass useSuiClient() return type work without cast. */
type SuiClient = SuiJsonRpcClient;
import type { Oath, OathStatus, BreachReason, OathTypeVariant } from "./mock";
import { CHAIN, USDC_TYPE, explorerObject } from "./chain-config";

const STATUS: OathStatus[] = ["Active", "Kept", "Broken", "Settled"];
const BREACH: BreachReason[] = ["Drawdown", "MinTrades", "MinPnl", "MinVolume"];

const ascii = (a: number[]) => new TextDecoder().decode(Uint8Array.from(a));
const alias = (addr: string) => "OP-" + addr.slice(2, 6).toUpperCase();

type MoveFields = Record<string, unknown>;
type NestedMoveFields = { fields: MoveFields };
type MoveObjectId = { id: string };

function prose(dims: Oath["dims"], assets: string[]): string {
  const dd = (dims.maxDrawdownBps / 100).toFixed(0);
  const parts = [`Holds drawdown at or under ${dd}%`, `at least ${dims.minTrades} trades`];
  if (dims.minPnlBps > 0) parts.push(`at least ${(dims.minPnlBps / 100).toFixed(0)}% net PnL`);
  return `${parts.join(", ")} on ${assets.join("/")} this epoch.`;
}

/** Map a getObject(showContent) result to the Oath view-model. Returns null if not an Oath. */
export function mapOath(content: unknown): Oath | null {
  const c = content as { dataType?: string; type?: string; fields?: MoveFields };
  if (!c || c.dataType !== "moveObject" || !String(c.type).includes("::oath::Oath<")) return null;
  const f = c.fields as MoveFields;
  const scope = f.scope as NestedMoveFields;
  const dimsFields = (f.dims as NestedMoveFields).fields;
  const assets = (scope.fields.allowed_assets as number[][]).map(ascii);
  const dims = {
    maxDrawdownBps: Number(dimsFields.max_drawdown_bps),
    minTrades: Number(dimsFields.min_trades),
    minPnlBps: Number(dimsFields.min_pnl_bps),
    minVolumeUsdc: Number(dimsFields.min_volume_usdc),
  };
  const oathId = (f.id as MoveObjectId).id;
  return {
    oathId,
    promiser: f.promiser as string,
    promiserAlias: alias(f.promiser as string),
    client: f.client as string,
    oathType: (f.oath_type as { variant: string }).variant as OathTypeVariant,
    bondAmount: Number(f.bond),
    clientClaim: Number(f.client_claim),
    clientClaimText: prose(dims, assets),
    dims,
    totalBelieverStakes: Number(f.total_believer_stakes ?? f.believer_pool),
    totalDoubterStakes: Number(f.total_doubter_stakes ?? f.doubter_pool),
    currentEquity: Number(f.current_equity_usdc),
    startingEquity: Number(f.starting_equity_usdc),
    tradeCount: Number(f.trade_count),
    cumulativeVolume: Number(f.cumulative_volume_usdc),
    epochEndMs: Number(f.epoch_end_ms),
    status: STATUS[Number(f.status)] ?? "Active",
    breachReason: f.breach_reason == null ? undefined : BREACH[Number(f.breach_reason)],
    standing: { kept: 0, broken: 0 },
    assets,
    attestations: [],
    onchain: true,
    explorerUrl: explorerObject(oathId),
    execAddr: scope.fields.exec_addr as string | undefined,
    // Dispute fields exist only on the hardened package; default safely on older objects.
    disputed: Boolean(f.disputed),
    disputeCount: Number(f.dispute_count ?? 0),
    // verifiability_tier exists only on the witnessed-tier package; default SELF_REPORTED (0).
    verifiabilityTier: Number(f.verifiability_tier ?? 0) === 1 ? "WITNESSED" : "SELF_REPORTED",
    // Optional until the witnessed package exposes the bound BalanceManager id in snapshots.
    balanceManagerId: f.balance_manager_id as string | undefined,
  };
}

async function getMinted(client: SuiClient): Promise<{ oathId: string; promiser: string; ts: number }[]> {
  const out: { oathId: string; promiser: string; ts: number }[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  for (;;) {
    const page = await client.queryEvents({
      query: { MoveEventType: `${CHAIN.packageId}::oath::OathMinted` },
      cursor: cursor ?? undefined, limit: 50, order: "ascending",
    });
    for (const e of page.data) {
      const j = e.parsedJson as { oath_id: string; promiser: string };
      out.push({ oathId: j.oath_id, promiser: j.promiser, ts: Number(e.timestampMs ?? 0) });
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

/** OathSettled outcomes (final_status: 1=Kept, 2=Broken). No promiser on the event. */
async function getSettled(client: SuiClient): Promise<{ oathId: string; finalStatus: number }[]> {
  const out: { oathId: string; finalStatus: number }[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  for (;;) {
    const page = await client.queryEvents({
      query: { MoveEventType: `${CHAIN.packageId}::oath::OathSettled` },
      cursor: cursor ?? undefined, limit: 50, order: "ascending",
    });
    for (const e of page.data) {
      const j = e.parsedJson as { oath_id: string; final_status: number };
      out.push({ oathId: j.oath_id, finalStatus: Number(j.final_status) });
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

/** Per-operator kept/broken track record: join OathMinted(promiser) with OathSettled(status). */
function buildStandings(
  minted: { oathId: string; promiser: string }[],
  settled: { oathId: string; finalStatus: number }[],
): Map<string, { kept: number; broken: number }> {
  const oathToPromiser = new Map(minted.map((m) => [m.oathId, m.promiser]));
  const standings = new Map<string, { kept: number; broken: number }>();
  for (const s of settled) {
    const promiser = oathToPromiser.get(s.oathId);
    if (!promiser) continue;
    const cur = standings.get(promiser) ?? { kept: 0, broken: 0 };
    if (s.finalStatus === 1) cur.kept++;
    else if (s.finalStatus === 2) cur.broken++;
    standings.set(promiser, cur);
  }
  return standings;
}

export async function fetchStandings(client: SuiClient): Promise<Map<string, { kept: number; broken: number }>> {
  const [minted, settled] = await Promise.all([getMinted(client), getSettled(client)]);
  return buildStandings(minted, settled);
}

async function readOaths(client: SuiClient, ids: string[]): Promise<Oath[]> {
  const oaths: Oath[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const objs = await client.multiGetObjects({ ids: ids.slice(i, i + 50), options: { showContent: true, showType: true } });
    for (const o of objs) {
      const m = mapOath((o.data as { content?: unknown })?.content);
      if (m) oaths.push(m);
    }
  }
  return oaths;
}

/** All oaths in the deployment, newest epoch-end first, with real operator Standing. */
export async function fetchAllOaths(client: SuiClient): Promise<Oath[]> {
  const [minted, settled] = await Promise.all([getMinted(client), getSettled(client)]);
  const oaths = await readOaths(client, minted.map((m) => m.oathId));
  const standings = buildStandings(minted, settled);
  for (const o of oaths) o.standing = standings.get(o.promiser) ?? { kept: 0, broken: 0 };
  return oaths.sort((a, b) => b.epochEndMs - a.epochEndMs);
}

/** One oath, live. */
export async function fetchOath(client: SuiClient, oathId: string): Promise<Oath | null> {
  const r = await client.getObject({ id: oathId, options: { showContent: true, showType: true } });
  return mapOath((r.data as { content?: unknown })?.content);
}

/** Oaths the wallet created (Oathkeeper role). */
export async function fetchOathkeeperOaths(client: SuiClient, owner: string): Promise<Oath[]> {
  const minted = await getMinted(client);
  const mine = minted.filter((m) => m.promiser === owner).map((m) => m.oathId);
  return readOaths(client, mine);
}

export interface OwnedPosition {
  positionId: string;
  side: "Believer" | "Doubter";
  oathId: string;
  stakeAmount: number;
  claimed: boolean;
}

/** Believer + Doubter position objects the wallet owns. */
export async function fetchOwnedPositions(client: SuiClient, owner: string): Promise<OwnedPosition[]> {
  const types: Array<["Believer" | "Doubter", string]> = [
    ["Believer", `${CHAIN.packageId}::believer::BelieverPosition<${USDC_TYPE}>`],
    ["Doubter", `${CHAIN.packageId}::doubter::DoubterPosition<${USDC_TYPE}>`],
  ];
  const out: OwnedPosition[] = [];
  for (const [side, structType] of types) {
    let cursor: string | null = null;
    for (;;) {
      const page = await client.getOwnedObjects({
        owner, filter: { StructType: structType },
        options: { showContent: true }, cursor: cursor ?? undefined, limit: 50,
      });
      for (const o of page.data) {
        const f = (o.data as { content?: { fields?: MoveFields } })?.content?.fields;
        if (!f) continue;
        const id = f.id as MoveObjectId;
        out.push({
          positionId: id.id, side, oathId: f.oath_id as string,
          stakeAmount: Number(f.stake_amount), claimed: Boolean(f.claimed),
        });
      }
      if (!page.hasNextPage || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
  }
  return out;
}

/** Live attested fills for an oath, newest-first, from TradeAttested events. */
export async function fetchAttestations(
  client: SuiClient,
  oathId: string,
): Promise<import("./mock").AttestationRow[]> {
  const rows: import("./mock").AttestationRow[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  for (;;) {
    const page = await client.queryEvents({
      query: { MoveEventType: `${CHAIN.packageId}::attestation::TradeAttested` },
      cursor: cursor ?? undefined, limit: 50, order: "descending",
    });
    for (const e of page.data) {
      const j = e.parsedJson as {
        oath_id: string; venue_tx_hash: number[]; asset: number[];
        pnl_delta: string; pnl_negative: boolean; equity_after: string; notional: string; timestamp_ms: string;
      };
      if (j.oath_id !== oathId) continue;
      const pnl = Number(j.pnl_delta) * (j.pnl_negative ? -1 : 1);
      rows.push({
        txHash: ascii(j.venue_tx_hash),
        asset: ascii(j.asset),
        pnlDelta: pnl,
        equityAfter: Number(j.equity_after),
        notional: Number(j.notional),
        timestampMs: Number(j.timestamp_ms),
      });
    }
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

/** Cumulative believer/doubter pool series for an oath, from stake events. */
export interface SentimentPoint { ts: number; believer: number; doubter: number }

export async function fetchSentimentSeries(client: SuiClient, oathId: string): Promise<SentimentPoint[]> {
  const events: { ts: number; side: "b" | "d"; amount: number }[] = [];
  for (const [mod, evt, side] of [
    ["believer", "BelieverStaked", "b"],
    ["doubter", "DoubterStaked", "d"],
  ] as const) {
    let cursor: { txDigest: string; eventSeq: string } | null = null;
    for (;;) {
      const page = await client.queryEvents({
        query: { MoveEventType: `${CHAIN.packageId}::${mod}::${evt}` },
        cursor: cursor ?? undefined, limit: 50, order: "ascending",
      });
      for (const e of page.data) {
        const j = e.parsedJson as { oath_id: string; stake_amount: string };
        if (j.oath_id !== oathId) continue;
        events.push({ ts: Number(e.timestampMs ?? 0), side, amount: Number(j.stake_amount) });
      }
      if (!page.hasNextPage || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
  }
  events.sort((a, b) => a.ts - b.ts);
  let believer = 0, doubter = 0;
  const series: SentimentPoint[] = [];
  for (const e of events) {
    if (e.side === "b") believer += e.amount; else doubter += e.amount;
    series.push({ ts: e.ts, believer, doubter });
  }
  return series;
}
