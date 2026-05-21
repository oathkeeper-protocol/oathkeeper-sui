/// Exec-wallet signature verification.
///
/// Two paths:
///   - ed25519: native Sui exec wallet (DeepBook venue).
///   - ecdsa_k1: EVM-compatible exec wallet (Hyperliquid venue) via secp256k1_ecrecover.
///
/// Replay protection: signed message preimage MUST include (oath_id-placeholder via
/// scope_hash, epoch_id, binding_nonce, valid_from, valid_until). A single exec_addr
/// cannot back two active oaths simultaneously — enforced separately in `registry`.
module oathkeeper::signature;

// === Errors ===
const EInvalidSignature: u64 = 0;
const ESignatureExpired: u64 = 1;
const ESignatureNotYetValid: u64 = 2;
const EVenueUnknown: u64 = 3;
const ERecoveredAddrMismatch: u64 = 4;

// === Signature scheme tags ===
const SCHEME_ED25519: u8 = 0;
const SCHEME_ECDSA_K1: u8 = 1;

// === Public verification surface ===

/// Verifies an exec-wallet signature over the canonical binding message.
/// Returns true on success; aborts on malformed input.
///
/// `scheme` selects ed25519 (Sui-native) or ecdsa_k1 (EVM-compatible).
/// `claimed_exec_addr` must match the address derivable from `pubkey` (ed25519)
/// or recovered from `signature` (ecdsa_k1).
public fun verify_exec_binding(
    scheme: u8,
    pubkey: vector<u8>,
    signature: vector<u8>,
    claimed_exec_addr: address,
    scope_hash: vector<u8>,
    epoch_id: u64,
    binding_nonce: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    now_ms: u64,
): bool { abort 0 }

/// Canonical preimage builder. Public so off-chain signers can construct the exact bytes.
public fun build_binding_preimage(
    scope_hash: vector<u8>,
    epoch_id: u64,
    binding_nonce: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
): vector<u8> { abort 0 }
