/**
 * Read-only settlement verifier — `pnpm verify [oathId]`.
 *
 * The complement to the reconciler. Where the reconciler verifies the *inputs* (did the
 * attested fills happen), this verifies the *settlement*: given the on-chain inputs (bond,
 * client_claim, believer/doubter stakes) and the final status, it INDEPENDENTLY re-derives
 * the 10/20/70 split + bond routing and checks the on-chain distribution matches — and that
 * conservation holds (Σ in = Σ out). No wallet, no gas: anyone can run it against any settled
 * oath and confirm the protocol distributed funds exactly as the rules require.
 *
 *   pnpm verify              # list settled oaths on the package
 *   pnpm verify <oathId>     # verify one settled oath end-to-end
 */
import { makeClient, env } from '../sui/client.js';
import { log } from '../log.js';

const PLATFORM_BPS = 1000n;
const SECONDARY_BPS = 2000n;

/** Mirror of economics::compute_split — subtraction-based winner share for exact conservation. */
function computeSplit(total: bigint): { platform: bigint; secondary: bigint; winner: bigint } {
  const platform = (total * PLATFORM_BPS) / 10000n;
  const secondary = (total * SECONDARY_BPS) / 10000n;
  return { platform, secondary, winner: total - platform - secondary };
}

interface Inputs { bond: bigint; clientClaim: bigint; believer: bigint; doubter: bigint }

async function queryAll(client: ReturnType<typeof makeClient>, type: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: { txDigest: string; eventSeq: string } | null = null;
  for (let p = 0; p < 50; p++) {
    const r = await client.queryEvents({ query: { MoveEventType: type }, cursor: cursor ?? undefined, limit: 50, order: 'ascending' });
    out.push(...r.data);
    if (!r.hasNextPage || !r.nextCursor) break;
    cursor = r.nextCursor;
  }
  return out;
}

async function listSettled(client: ReturnType<typeof makeClient>): Promise<void> {
  const settled = await queryAll(client, `${env.packageId}::oath::OathSettled`);
  if (settled.length === 0) { console.log('No settled oaths on this package yet. Run the e2e (needs deployer key) to create one.'); return; }
  console.log(`Settled oaths on ${env.packageId.slice(0, 12)}…:`);
  for (const e of settled) {
    const j = e.parsedJson as any;
    console.log(`  ${j.oath_id}  ${j.final_status === 1 ? 'KEPT' : 'BROKEN'}`);
  }
  console.log('\nVerify one:  pnpm verify <oathId>');
}

async function gatherInputs(client: ReturnType<typeof makeClient>, oathId: string): Promise<Inputs> {
  const minted = (await queryAll(client, `${env.packageId}::oath::OathMinted`)).map((e) => e.parsedJson as any).find((j) => j.oath_id === oathId);
  if (!minted) throw new Error(`no OathMinted for ${oathId}`);
  const sum = async (type: string, field: string) =>
    (await queryAll(client, type)).map((e) => e.parsedJson as any).filter((j) => j.oath_id === oathId).reduce((a, j) => a + BigInt(j[field]), 0n);
  return {
    bond: BigInt(minted.bond_amount),
    clientClaim: BigInt(minted.client_claim),
    believer: await sum(`${env.packageId}::believer::BelieverStaked`, 'stake_amount'),
    doubter: await sum(`${env.packageId}::doubter::DoubterStaked`, 'stake_amount'),
  };
}

/** Re-derive the expected OathSettled distribution from inputs + final status (the contract's rules). */
function expectedDistribution(inp: Inputs, finalStatus: number) {
  if (finalStatus === 1) {
    // KEPT: bond -> promiser; loser pool = doubter stakes; winners = believers.
    const { platform, secondary, winner } = computeSplit(inp.doubter);
    const noWinners = inp.believer === 0n;
    return {
      bond_to_promiser: inp.bond, bond_to_client: 0n, bond_residual_to_platform: 0n,
      loser_to_platform: platform + (noWinners ? winner : 0n),
      loser_to_secondary: secondary,
      loser_to_winners: noWinners ? 0n : winner,
    };
  }
  // BROKEN: client_claim -> client, residual -> platform; loser pool = believer stakes; winners = doubters.
  const claim = inp.clientClaim <= inp.bond ? inp.clientClaim : inp.bond;
  const residual = inp.bond - claim;
  const { platform, secondary, winner } = computeSplit(inp.believer);
  const noWinners = inp.doubter === 0n;
  return {
    bond_to_promiser: 0n, bond_to_client: claim, bond_residual_to_platform: residual,
    loser_to_platform: platform + (noWinners ? winner : 0n),
    loser_to_secondary: secondary,
    loser_to_winners: noWinners ? 0n : winner,
  };
}

async function verify(client: ReturnType<typeof makeClient>, oathId: string): Promise<boolean> {
  const settledEv = (await queryAll(client, `${env.packageId}::oath::OathSettled`)).find((e) => (e.parsedJson as any).oath_id === oathId);
  if (!settledEv) throw new Error(`oath ${oathId} is not settled (no OathSettled event)`);
  const actual = settledEv.parsedJson as any;
  const status = Number(actual.final_status);
  const inp = await gatherInputs(client, oathId);
  const exp = expectedDistribution(inp, status);

  const line = '─'.repeat(70);
  console.log(line);
  console.log(`SETTLEMENT VERIFICATION  oath ${oathId}`);
  console.log(`outcome: ${status === 1 ? 'KEPT' : 'BROKEN'}    settle tx: ${settledEv.id.txDigest}`);
  console.log(`explorer: https://suiscan.xyz/testnet/tx/${settledEv.id.txDigest}`);
  console.log(line);
  console.log(`INPUTS (from chain):  bond=${inp.bond}  client_claim=${inp.clientClaim}  believer=${inp.believer}  doubter=${inp.doubter}`);
  const totalIn = inp.bond + inp.believer + inp.doubter;
  console.log(`Σ in = ${totalIn}`);
  console.log(line);

  // 1. Re-derived distribution must match the on-chain event field-by-field.
  const fields = ['bond_to_promiser', 'bond_to_client', 'bond_residual_to_platform', 'loser_to_platform', 'loser_to_secondary', 'loser_to_winners'] as const;
  let allMatch = true;
  for (const f of fields) {
    const a = BigInt(actual[f]); const e = (exp as any)[f] as bigint;
    const ok = a === e;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? '✓' : '✗'} ${f.padEnd(28)} on-chain=${a.toString().padStart(8)}  re-derived=${e}`);
  }
  console.log(line);

  // 2. Conservation. The OathSettled event accounts for the bond + the loser pool only.
  // The WINNERS' OWN stakes also sit in the winner_payout_pool and return to them via
  // claim_payout — so full conservation = event outflows + winners' own stakes.
  const winnersOwn = status === 1 ? inp.believer : inp.doubter;
  const eventOut = fields.reduce((a, f) => a + BigInt(actual[f]), 0n);
  const totalOut = eventOut + winnersOwn;
  const conserves = totalOut === totalIn;
  console.log(`  loser pool + bond distributed at settle (event): ${eventOut}`);
  console.log(`  + winners' own stakes returned via claim_payout:  ${winnersOwn}`);
  console.log(`  ${conserves ? '✓' : '✗'} CONSERVATION   Σ out = ${totalOut}   (Σ in = ${totalIn})   delta = ${totalOut - totalIn}`);

  // 3. Independent corroboration: actual winner claim payouts, if any have executed.
  const winnerType = status === 1 ? `${env.packageId}::believer::BelieverPayout` : `${env.packageId}::doubter::DoubterPayout`;
  const paid = (await queryAll(client, winnerType)).map((e) => e.parsedJson as any).filter((j) => j.oath_id === oathId).reduce((a, j) => a + BigInt(j.amount), 0n);
  const winnerPool = BigInt(actual.loser_to_winners) + winnersOwn;
  if (paid > 0n) {
    const claimsOk = paid === winnerPool;
    console.log(`  ${claimsOk ? '✓' : '✗'} WINNER CLAIMS  paid out ${paid}  (expected winner pool = ${winnerPool})`);
  } else {
    console.log(`  · winner pool = ${winnerPool} (no claim_payout executed yet — winners can claim this pro-rata)`);
  }
  console.log(line);

  const pass = allMatch && conserves;
  console.log(pass
    ? 'VERDICT: ✓ VERIFIED — distribution matches the protocol rules and conserves to zero.'
    : 'VERDICT: ✗ FAILED — on-chain distribution does not match the re-derived rules.');
  console.log(line);
  return pass;
}

async function main() {
  if (env.packageId === '0x0') throw new Error('Set OATHKEEPER_PACKAGE_ID in agent/.env');
  const client = makeClient();
  const oathId = process.argv[2];
  if (!oathId) { await listSettled(client); return; }
  const ok = await verify(client, oathId);
  process.exit(ok ? 0 : 2);
}

main().catch((e) => { log.error({ err: String(e?.message ?? e) }, 'verify failed'); process.exit(1); });
