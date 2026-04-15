#!/usr/bin/env bash
# Flexiele MCP — installer
# Usage:
#   bash install.sh              (interactive — prompts for sessionId)
#   FLEXIELE_SESSION_ID=... bash install.sh  (non-interactive)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_CONFIG="$HOME/.claude.json"

echo ""
echo "================================================"
echo "  Flexiele HRMS MCP — Installer"
echo "================================================"
echo ""

# 1. Node check
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 18+ first: https://nodejs.org"
  exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node $NODE_MAJOR detected. Need Node 18+."
  exit 1
fi
echo "[ok] Node $(node -v)"

# 2. Claude Code config check
if [ ! -f "$CLAUDE_CONFIG" ]; then
  echo "ERROR: $CLAUDE_CONFIG not found. Install Claude Code first: https://claude.ai/code"
  exit 1
fi

# 3. Install deps + build
echo "[..] Installing dependencies..."
cd "$REPO_DIR"
npm install --silent --no-audit --no-fund
echo "[..] Building..."
npm run build --silent
echo "[ok] Built → $REPO_DIR/dist"

# 4. Get sessionId
SESSION_ID="${FLEXIELE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  echo ""
  echo "------------------------------------------------"
  echo "Need your Flexiele sessionId."
  echo ""
  echo "Easiest way — paste this in DevTools Console on"
  echo "https://feexotel.flexiele.com (one line, copies"
  echo "sessionId to your clipboard):"
  echo ""
  cat "$REPO_DIR/get-sessionid.js" | sed 's/^/  /'
  echo ""
  echo "(Or: DevTools → Network → reload → find userInfo"
  echo "→ Response → copy sessionId manually.)"
  echo "------------------------------------------------"
  echo ""
  read -r -p "Paste sessionId: " SESSION_ID
fi

if [ -z "$SESSION_ID" ]; then
  echo "ERROR: empty sessionId"
  exit 1
fi

# 5. Patch ~/.claude.json (atomic, with backup)
BACKUP="$CLAUDE_CONFIG.bak.$(date +%s)"
cp "$CLAUDE_CONFIG" "$BACKUP"
TMP_FILE="$(mktemp)"

node - "$CLAUDE_CONFIG" "$REPO_DIR/dist/index.js" "$SESSION_ID" "$TMP_FILE" <<'NODE_EOF'
const fs = require('fs');
const [,, cfgPath, entryPath, sid, tmpPath] = process.argv;
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers.flexiele = {
  command: "node",
  args: [entryPath],
  env: { FLEXIELE_SESSION_ID: sid }
};
fs.writeFileSync(tmpPath, JSON.stringify(cfg, null, 2));
NODE_EOF

# Validate the new config parses, then move into place
if ! node -e "JSON.parse(require('fs').readFileSync('$TMP_FILE','utf8'))"; then
  echo "ERROR: generated config is invalid JSON. Original preserved at $BACKUP"
  rm -f "$TMP_FILE"
  exit 1
fi
mv "$TMP_FILE" "$CLAUDE_CONFIG"
echo "[ok] Registered 'flexiele' MCP in $CLAUDE_CONFIG"
echo "[ok] Backup of previous config: $BACKUP"

echo ""
echo "================================================"
echo "  Done. Restart Claude Code to load the MCP."
echo ""
echo "  Try asking:"
echo "    • Who has the most direct reports at Exotel?"
echo "    • Show me Anuja Dhawan's reporting chain"
echo "    • Headcount by office"
echo "================================================"
