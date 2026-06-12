import { bcs } from '@mysten/sui/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { keccak_256 } from '@noble/hashes/sha3.js';

export interface WitnessedScopeInputs {
  execAddr: string;
  venue: number;
  allowedAssets: string[];
  epochDurationMs: bigint;
  maxDrawdownBps: bigint;
  minTrades: bigint;
  minPnlBps: bigint;
  minVolumeUsdc: bigint;
  oathTypeTag?: number;
}

export interface BindingWindow {
  bindingNonce: bigint;
  validFromMs: bigint;
  validUntilMs: bigint;
}

const OATH_TYPE_TRADING = 0;

function hexToBytes(hex: string, len?: number): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = len ? clean.padStart(len * 2, '0') : clean;
  if (padded.length % 2 !== 0) throw new Error(`Invalid hex length for ${hex}`);
  const out = new Uint8Array(padded.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function uleb128(n: number): number[] {
  const out: number[] = [];
  let x = n;
  do {
    let byte = x & 0x7f;
    x >>= 7;
    if (x > 0) byte |= 0x80;
    out.push(byte);
  } while (x > 0);
  return out;
}

function vectorBytes(bytes: Uint8Array): number[] {
  return [...uleb128(bytes.length), ...bytes];
}

function vectorVectorBytes(values: Uint8Array[]): number[] {
  return [...uleb128(values.length), ...values.flatMap(vectorBytes)];
}

function u64Bytes(value: bigint): Uint8Array {
  return Uint8Array.from(bcs.u64().serialize(value.toString()).toBytes());
}

/** Mirrors oath_registry::compute_scope_hash exactly. */
export function computeWitnessedScopeHash(inputs: WitnessedScopeInputs): Uint8Array {
  const allowedAssets = inputs.allowedAssets.map((asset) => new TextEncoder().encode(asset));
  const preimage = new Uint8Array([
    ...hexToBytes(inputs.execAddr, 32),
    inputs.venue,
    ...vectorVectorBytes(allowedAssets),
    ...u64Bytes(inputs.epochDurationMs),
    ...u64Bytes(inputs.maxDrawdownBps),
    ...u64Bytes(inputs.minTrades),
    ...u64Bytes(inputs.minPnlBps),
    ...u64Bytes(inputs.minVolumeUsdc),
    inputs.oathTypeTag ?? OATH_TYPE_TRADING,
  ]);
  return keccak_256(preimage);
}

export function buildBindingPreimage(scopeHash: Uint8Array, window: BindingWindow): Uint8Array {
  return new Uint8Array([
    ...scopeHash,
    ...u64Bytes(window.bindingNonce),
    ...u64Bytes(window.validFromMs),
    ...u64Bytes(window.validUntilMs),
  ]);
}

export async function signWitnessedBinding(
  exec: Ed25519Keypair,
  scope: WitnessedScopeInputs,
  window: BindingWindow,
): Promise<{ signature: number[]; pubkey: number[]; scopeHashHex: string }> {
  const scopeHash = computeWitnessedScopeHash(scope);
  const signature = await exec.sign(buildBindingPreimage(scopeHash, window));
  return {
    signature: [...signature],
    pubkey: [...exec.getPublicKey().toRawBytes()],
    scopeHashHex: `0x${Array.from(scopeHash).map((b) => b.toString(16).padStart(2, '0')).join('')}`,
  };
}
