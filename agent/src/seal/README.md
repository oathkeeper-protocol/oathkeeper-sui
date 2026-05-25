# Seal integration — Week 2 Day 11

Access policy: the sealed oath text is encrypted so **only the bound `exec_addr` of an
active oath can decrypt**. The Move access-condition module (lands Day 11) reads:

```move
public fun can_decrypt_oath_text(
    requester: address,
    oath_id: ID,
    registry: &Registry,
): bool {
    let oath = registry::get_oath(registry, oath_id);
    requester == oath.exec_addr && oath.status == STATUS_ACTIVE
}
```

The Seal key servers query this on every decrypt request. Decryption succeeds iff
t-of-n key servers approve.

## SDK status

Per the May 20 architecture pass: package name not yet confirmed. Pin assumption is
`@mysten/seal` or similar — verify Day 8 before Week 2 starts. Until then this directory
holds only this README + type stubs.

## Why this beats TEE (pitch language)

- TEE trust assumes one operator's enclave is honest
- Seal trust is distributed across t-of-n key servers, with access policy enforced by
  on-chain Move code
- Both prevent the operator from reading the oath text
- Seal's policy is **publicly auditable** (it's a Move contract on Sui); TEE attestation
  requires verifying a remote attestation chain

Lead with this in the pitch. Don't apologize for not having TEE — claim the upgrade.
