#[test_only]
module oathkeeper::signature_tests;

use oathkeeper::signature;

// === Preimage helpers (4 args after the epoch_id removal) ===

#[test]
fun build_binding_preimage_is_deterministic() {
    let p1 = signature::build_binding_preimage(b"scope", 1, 2, 3);
    let p2 = signature::build_binding_preimage(b"scope", 1, 2, 3);
    assert!(p1 == p2);
}

#[test]
fun build_binding_preimage_changes_on_nonce() {
    let p1 = signature::build_binding_preimage(b"scope", 1, 3, 4);
    let p2 = signature::build_binding_preimage(b"scope", 2, 3, 4);
    assert!(p1 != p2);
}

#[test]
fun derive_ed25519_address_is_deterministic() {
    let pk = x"cc62332e34bb2d5cd69f60efbb2a36cb916c7eb458301ea36636c4dbb012bd88";
    let a1 = signature::derive_ed25519_address(&pk);
    let a2 = signature::derive_ed25519_address(&pk);
    assert!(a1 == a2);
}

#[test]
fun derive_ed25519_address_differs_per_pubkey() {
    let pk1 = x"cc62332e34bb2d5cd69f60efbb2a36cb916c7eb458301ea36636c4dbb012bd88";
    let pk2 = x"dd62332e34bb2d5cd69f60efbb2a36cb916c7eb458301ea36636c4dbb012bd88";
    let a1 = signature::derive_ed25519_address(&pk1);
    let a2 = signature::derive_ed25519_address(&pk2);
    assert!(a1 != a2);
}

// === verify_exec_binding window checks (via ecdsa_k1 pass-through path) ===

#[test]
fun verify_in_window_passes_via_ecdsa_k1_passthrough() {
    let ok = signature::verify_exec_binding(
        signature::scheme_ecdsa_k1(),
        b"any",
        b"any",
        @0xAA,
        b"scope",
        /* binding_nonce */ 2,
        /* valid_from_ms */ 100,
        /* valid_until_ms */ 200,
        /* now_ms */ 150,
    );
    assert!(ok);
}

#[test]
#[expected_failure(abort_code = oathkeeper::signature::ESignatureNotYetValid)]
fun verify_before_valid_from_aborts() {
    signature::verify_exec_binding(
        signature::scheme_ecdsa_k1(), b"any", b"any", @0xAA, b"scope",
        2, 100, 200, /* now_ms */ 50,
    );
}

#[test]
#[expected_failure(abort_code = oathkeeper::signature::ESignatureExpired)]
fun verify_after_valid_until_aborts() {
    signature::verify_exec_binding(
        signature::scheme_ecdsa_k1(), b"any", b"any", @0xAA, b"scope",
        2, 100, 200, /* now_ms */ 300,
    );
}

#[test]
#[expected_failure(abort_code = oathkeeper::signature::EVenueUnknown)]
fun verify_unknown_scheme_aborts() {
    signature::verify_exec_binding(
        99, b"any", b"any", @0xAA, b"scope", 2, 100, 200, 150,
    );
}

// === ed25519 real-verification path — TRUE-POSITIVE vector ===
//
// Vector generated offline by agent/src/gen-ed25519-vector.ts: a real ed25519 keypair
// signs the EXACT bytes build_binding_preimage produces for
// (scope_hash=0x07*32, binding_nonce=42, valid_from=1000, valid_until=999999999999).
// The derived Sui address blake2b256(0x00||pubkey) must equal derive_ed25519_address(pubkey).
// This closes the gap flagged in the prior version: the real ed25519 path is now proven,
// not just the length/mismatch guards.

#[test]
fun ed25519_real_signature_verifies() {
    let pubkey = x"79b5562e8fe654f94078b112e8a98ba7901f853ae695bed7e0e3910bad049664";
    let sig = x"1781096e736fe843e4570f277feff9331478e52c2e5fc0ba6ad1b62162c84690e6f80d2531b0211aac8fbb9f4979cd2e32323c3d1dceda4e1ba282d28cb01f07";
    let scope_hash = x"0707070707070707070707070707070707070707070707070707070707070707";
    let exec_addr = @0x7573c697fa68450f04fa0dee2d39dcdc8a5ccf5db547f3e47638a6f8eeeec110;

    // Address derivation matches the offline computation.
    assert!(signature::derive_ed25519_address(&pubkey) == exec_addr);

    // Real signature verifies over the canonical preimage, in window.
    let ok = signature::verify_exec_binding(
        signature::scheme_ed25519(),
        pubkey,
        sig,
        exec_addr,
        scope_hash,
        /* binding_nonce */ 42,
        /* valid_from_ms */ 1000,
        /* valid_until_ms */ 999_999_999_999,
        /* now_ms */ 5000,
    );
    assert!(ok);
}

#[test]
#[expected_failure(abort_code = oathkeeper::signature::EInvalidSignature)]
fun ed25519_tampered_signature_aborts() {
    let pubkey = x"79b5562e8fe654f94078b112e8a98ba7901f853ae695bed7e0e3910bad049664";
    // First byte flipped from 0x17 to 0x18 — addr still derives correctly, sig must fail.
    let bad_sig = x"1881096e736fe843e4570f277feff9331478e52c2e5fc0ba6ad1b62162c84690e6f80d2531b0211aac8fbb9f4979cd2e32323c3d1dceda4e1ba282d28cb01f07";
    let scope_hash = x"0707070707070707070707070707070707070707070707070707070707070707";
    let exec_addr = @0x7573c697fa68450f04fa0dee2d39dcdc8a5ccf5db547f3e47638a6f8eeeec110;
    signature::verify_exec_binding(
        signature::scheme_ed25519(), pubkey, bad_sig, exec_addr, scope_hash,
        42, 1000, 999_999_999_999, 5000,
    );
}

#[test]
#[expected_failure(abort_code = oathkeeper::signature::EBadPubkeyLength)]
fun ed25519_short_pubkey_aborts() {
    signature::verify_exec_binding(
        signature::scheme_ed25519(), b"short", b"sig", @0xAA, b"scope",
        2, 100, 200, 150,
    );
}

#[test]
#[expected_failure(abort_code = oathkeeper::signature::EPubkeyAddrMismatch)]
fun ed25519_pubkey_addr_mismatch_aborts() {
    let pk = x"cc62332e34bb2d5cd69f60efbb2a36cb916c7eb458301ea36636c4dbb012bd88";
    signature::verify_exec_binding(
        signature::scheme_ed25519(), pk, b"sig_irrelevant_we_abort_before",
        @0xAA, // claimed addr does NOT match derive(pk)
        b"scope", 2, 100, 200, 150,
    );
}
