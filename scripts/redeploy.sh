#!/usr/bin/env bash
# One-shot redeploy: publish the hardened contracts to testnet, capture the new object
# ids, repoint agent/.env + frontend chain-config.ts, reseed demo oaths, regenerate the
# frontend snapshot. Run from repo root once the deployer wallet has gas (~0.3 SUI):
#   bash scripts/redeploy.sh
#
# Requires: sui CLI on the testnet env with a funded active address, bun, node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
AGENT="$ROOT/agent"
CONFIG="$ROOT/frontend/src/lib/chain-config.ts"
DEPLOYER_KEY="$(grep -E '^OATHKEEPER_DEPLOYER_KEY=' "$AGENT/.env" | cut -d= -f2-)"

echo "==> Publishing contracts to testnet..."
PUB_JSON="$(cd "$CONTRACTS" && sui client publish --gas-budget 300000000 --json 2>/dev/null)"

# Parse package / Registry / shared USDC TreasuryCap ids.
read -r PKG REG CAP <<EOF
$(node -e '
const r = JSON.parse(process.argv[1]);
const pkg = (r.objectChanges||[]).find(o=>o.type==="published");
let reg="", cap="";
for (const o of (r.objectChanges||[])) if (o.type==="created") {
  const t=o.objectType||"";
  if (t.includes("::oath_registry::Registry")) reg=o.objectId;
  if (t.includes("TreasuryCap") && t.includes("::usdc::USDC")) cap=o.objectId;
}
process.stdout.write([pkg?pkg.packageId:"", reg, cap].join(" "));
' "$PUB_JSON")
EOF

if [[ -z "$PKG" || -z "$REG" || -z "$CAP" ]]; then
  echo "ERROR: failed to parse ids (PKG=$PKG REG=$REG CAP=$CAP)"; exit 1
fi
echo "    package:  $PKG"
echo "    registry: $REG"
echo "    usdc cap: $CAP"

echo "==> Writing agent/.env"
cat > "$AGENT/.env" <<ENV
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
OATHKEEPER_PACKAGE_ID=$PKG
OATHKEEPER_REGISTRY_ID=$REG
OATHKEEPER_USDC_TREASURY_ID=$CAP
OATHKEEPER_DEPLOYER_KEY=$DEPLOYER_KEY
LOG_LEVEL=info
ENV

echo "==> Repointing $CONFIG"
node -e '
const fs=require("fs"); const [f,pkg,reg,cap]=process.argv.slice(1);
let s=fs.readFileSync(f,"utf8");
s=s.replace(/packageId:\s*"0x[0-9a-fA-F]+"/, `packageId: "${pkg}"`);
s=s.replace(/registryId:\s*"0x[0-9a-fA-F]+"/, `registryId: "${reg}"`);
s=s.replace(/usdcTreasuryId:\s*"0x[0-9a-fA-F]+"/, `usdcTreasuryId: "${cap}"`);
fs.writeFileSync(f,s);
' "$CONFIG" "$PKG" "$REG" "$CAP"

echo "==> Seeding demo oaths"
( cd "$AGENT" && bunx tsx src/seed.ts )

echo "==> Regenerating frontend snapshot"
( cd "$AGENT" && bunx tsx src/snapshot.ts )

echo ""
echo "DONE. New testnet deployment wired across agent/.env + chain-config.ts + snapshot."
echo "Next: cd frontend && bun run build   (verify)"
echo "      cd agent && SCENARIO=kept bunx tsx src/e2e.ts   (re-prove settle/claim on new pkg)"
