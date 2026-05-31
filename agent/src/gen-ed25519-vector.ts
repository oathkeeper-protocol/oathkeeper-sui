/**
 * Offline generator for a REAL ed25519 binding-signature test vector.
 *
 * The Move test harness cannot sign, so we generate (pubkey, signature, derived
 * Sui address) here over the EXACT preimage bytes that signature::build_binding_preimage
 * produces, then hardcode them into a Move test. This proves the on-chain ed25519
 * verification path actually works (advisor: "unproven until a real vector passes").
 *
 * Preimage layout (must match signature.move::build_binding_preimage AFTER the fix):
 *   scope_hash (raw bytes) || bcs(binding_nonce u64) || bcs(valid_from_ms u64) || bcs(valid_until_ms u64)
 *
 * Sui address derivation (must match signature.move::derive_ed25519_address):
 *   blake2b256(0x00 || pubkey)  — which is exactly Ed25519Keypair.toSuiAddress().
 *
 * Run: bunx tsx src/gen-ed25519-vector.ts   (or pnpm exec tsx ...)
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/sui/bcs';

// Deterministic 32-byte seed so the vector is reproducible.
const seed = new Uint8Array(32);
for (let i = 0; i < 32; i++) seed[i] = i + 1;

const kp = Ed25519Keypair.fromSecretKey(seed);
const pubkey = kp.getPublicKey().toRawBytes(); // 32 bytes, no flag
const suiAddress = kp.toSuiAddress(); // 0x + 64 hex = blake2b256(0x00 || pubkey)

// Fixed binding inputs for the test.
const scopeHash = new Uint8Array(32).fill(0x07);
const bindingNonce = 42n;
const validFromMs = 1000n;
const validUntilMs = 999_999_999_999n;

function u64le(n: bigint): Uint8Array {
  return Uint8Array.from(bcs.u64().serialize(n.toString()).toBytes());
}

const preimage = new Uint8Array([
  ...scopeHash,
  ...u64le(bindingNonce),
  ...u64le(validFromMs),
  ...u64le(validUntilMs),
]);

const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

async function main() {
  const sig = await kp.sign(preimage); // raw ed25519 signature over the preimage bytes

  console.log('// === ed25519 binding test vector (generated offline) ===');
  console.log('// pubkey (32B):');
  console.log('let pubkey = x"' + hex(pubkey) + '";');
  console.log('// signature (64B):');
  console.log('let sig = x"' + hex(sig) + '";');
  console.log('// scope_hash (32B of 0x07):');
  console.log('let scope_hash = x"' + hex(scopeHash) + '";');
  console.log('// derived Sui address (must equal derive_ed25519_address(pubkey)):');
  console.log('let exec_addr = @' + suiAddress + ';');
  console.log('// binding_nonce=' + bindingNonce + ' valid_from=' + validFromMs + ' valid_until=' + validUntilMs);
  console.log('// preimage (for cross-check, ' + preimage.length + 'B): x"' + hex(preimage) + '"');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
