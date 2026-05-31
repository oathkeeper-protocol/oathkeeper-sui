/// Exec-wallet signature verification.
///
/// Two paths:
///   - ed25519:  native Sui exec wallet (DeepBook venue) — **real verification (Day 6).**
///   - ecdsa_k1: EVM-compatible exec wallet (Hyperliquid venue) — **test-mode pass-through.**
///               Real verification lands Day 16 with the Hyperliquid integration. At that
///               point `StrategyScope.exec_addr` must move from `address` (32 bytes) to a
///               `vector<u8>` (20 bytes for EVM), the scope_hash preimage shifts to match,
///               and EIP-191 prefix wrapping + `ecdsa_k1::decompress_pubkey` get added.
///
/// Replay protection: signed message preimage includes scope_hash, binding_nonce,
/// valid_from_ms, valid_until_ms. Every term is knowable off-chain BEFORE the binding
/// tx lands, so the exec wallet can pre-sign it (the earlier design folded the live
/// consensus clock into the preimage, which made the ed25519 path unsignable on a live
/// network). `now_ms` is checked against [valid_from_ms, valid_until_ms] at bind time but
/// is NOT part of the signed bytes. A single exec_addr cannot back two active oaths
/// simultaneously — enforced separately in `registry`.
module oathkeeper::signature;

use std::bcs;
use sui::address;
use sui::ed25519;
use sui::hash;

// === Errors ===
const EInvalidSignature: u64 = 0;
const ESignatureExpired: u64 = 1;
const ESignatureNotYetValid: u64 = 2;
const EVenueUnknown: u64 = 3;
const EPubkeyAddrMismatch: u64 = 4;
const EBadPubkeyLength: u64 = 5;

// === Signature scheme tags ===
const SCHEME_ED25519: u8 = 0;
const SCHEME_ECDSA_K1: u8 = 1;

// === Sui ed25519 derivation constants ===
/// Sui's scheme flag for ed25519 (prepended before pubkey, hashed with blake2b256).
const ED25519_FLAG: u8 = 0x00;
/// Canonical ed25519 public-key length in bytes.
const ED25519_PUBKEY_LEN: u64 = 32;

// === Public verification surface ===

/// Verifies an exec-wallet signature over the canonical binding message.
/// Returns true on success; aborts on out-of-window or malformed input.
///
/// `scheme` selects ed25519 (Sui-native, real) or ecdsa_k1 (EVM, test-mode pass-through
/// until Day 16). `claimed_exec_addr` must match the Sui address derived from `pubkey`
/// (ed25519 path).
public fun verify_exec_binding(
    scheme: u8,
    pubkey: vector<u8>,
    signature: vector<u8>,
    claimed_exec_addr: address,
    scope_hash: vector<u8>,
    binding_nonce: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    now_ms: u64,
): bool {
    assert!(scheme == SCHEME_ED25519 || scheme == SCHEME_ECDSA_K1, EVenueUnknown);
    assert!(now_ms >= valid_from_ms, ESignatureNotYetValid);
    assert!(now_ms <= valid_until_ms, ESignatureExpired);

    let preimage = build_binding_preimage(
        scope_hash,
        binding_nonce,
        valid_from_ms,
        valid_until_ms,
    );

    if (scheme == SCHEME_ED25519) {
        // --- Real ed25519 verification ---
        assert!(vector::length(&pubkey) == ED25519_PUBKEY_LEN, EBadPubkeyLength);

        // Derive Sui address from the pubkey: address = blake2b256(0x00 || pubkey).
        // This binds the signature to the *claimed* exec_addr so a valid signature from
        // an unrelated keypair can't pass verification.
        let derived = derive_ed25519_address(&pubkey);
        assert!(derived == claimed_exec_addr, EPubkeyAddrMismatch);

        let ok = ed25519::ed25519_verify(&signature, &pubkey, &preimage);
        assert!(ok, EInvalidSignature);
        true
    } else {
        // --- ecdsa_k1 / Hyperliquid: Day 16 work ---
        // Day 16 todos when this branch goes real:
        //   1. Move exec_addr storage from `address` to `vector<u8>` (20 bytes for EVM).
        //   2. Wrap preimage with EIP-191: keccak256("\x19Ethereum Signed Message:\n" || len || msg).
        //   3. Call ecdsa_k1::secp256k1_ecrecover(sig, &eip191_msg, hash_flag=0).
        //   4. ecdsa_k1::decompress_pubkey on the returned 33-byte compressed pubkey.
        //   5. Derive EVM address: keccak256(uncompressed[1..65])[12..32].
        //   6. Compare against claimed_exec_addr (as bytes).
        // Until then we accept any in-window call so the mint flow stays testable when
        // a Hyperliquid-bound oath is exercised.
        let _ = signature;
        let _ = pubkey;
        let _ = claimed_exec_addr;
        true
    }
}

/// Canonical preimage builder. Public so off-chain signers can construct the exact bytes
/// they need to sign. Layout: scope_hash || bcs(binding_nonce) || bcs(valid_from_ms) ||
/// bcs(valid_until_ms). All terms are known before the binding tx lands.
public fun build_binding_preimage(
    scope_hash: vector<u8>,
    binding_nonce: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
): vector<u8> {
    let mut preimage = vector::empty<u8>();
    vector::append(&mut preimage, scope_hash);
    vector::append(&mut preimage, bcs::to_bytes(&binding_nonce));
    vector::append(&mut preimage, bcs::to_bytes(&valid_from_ms));
    vector::append(&mut preimage, bcs::to_bytes(&valid_until_ms));
    preimage
}

/// Derive a Sui address from an ed25519 pubkey. Pure helper; public so off-chain signers
/// can predict the address their key will resolve to.
public fun derive_ed25519_address(pubkey: &vector<u8>): address {
    let mut preimage = vector::empty<u8>();
    vector::push_back(&mut preimage, ED25519_FLAG);
    vector::append(&mut preimage, *pubkey);
    address::from_bytes(hash::blake2b256(&preimage))
}

// === Scheme constants exposed for callers ===

public fun scheme_ed25519(): u8 { SCHEME_ED25519 }
public fun scheme_ecdsa_k1(): u8 { SCHEME_ECDSA_K1 }
