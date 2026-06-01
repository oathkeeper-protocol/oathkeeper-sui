/// Settlement split constants and payout helpers.
///
/// v2 economics: 5-role model (Oathkeeper, Client, Believer, Doubter, Platform).
/// No LP pool — Believers replace the LP role as active market participants.
///
/// Settlement splits (loser stakes):
///   10% → Platform
///   20% → Secondary beneficiary (Oathkeeper on Kept, Client on Broken)
///   70% → Winners (pro-rata by stake size)
///
/// Bond on Kept: 100% → Oathkeeper
/// Bond on Broken: client_claim → Client, residual → Platform
///
/// Conservation: Σ inflows = Σ outflows including Platform's 10%. Fully disclosed fee.
module oathkeeper::economics;

// === Split constants (basis points out of 10000) ===
const PLATFORM_BPS: u64 = 1000;
const SECONDARY_BPS: u64 = 2000;
const WINNER_BPS: u64 = 7000;

// === Accessors ===

public fun platform_bps(): u64 { PLATFORM_BPS }
public fun secondary_bps(): u64 { SECONDARY_BPS }
public fun winner_bps(): u64 { WINNER_BPS }

/// Compute the three-way split on a total amount.
/// Returns (platform_amount, secondary_amount, winner_amount).
/// Uses subtraction for the winner share to keep conservation exact on rounding.
public fun compute_split(total: u64): (u64, u64, u64) {
    let platform = (((total as u128) * (PLATFORM_BPS as u128) / 10000) as u64);
    let secondary = (((total as u128) * (SECONDARY_BPS as u128) / 10000) as u64);
    let winner = total - platform - secondary;
    (platform, secondary, winner)
}

#[test]
fun split_sums_to_total() {
    let (p, s, w) = compute_split(10000);
    assert!(p + s + w == 10000);
    assert!(p == 1000);
    assert!(s == 2000);
    assert!(w == 7000);
}

#[test]
fun split_handles_odd_amounts() {
    let (p, s, w) = compute_split(1333);
    assert!(p + s + w == 1333);
}

#[test]
fun split_handles_zero() {
    let (p, s, w) = compute_split(0);
    assert!(p == 0 && s == 0 && w == 0);
}
