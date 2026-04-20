#!/usr/bin/env bash
# Flexiele MCP — session refresh (run when you see 401 errors)
# Usage:  bash ~/flexiele-mcp/refresh-session.sh
set -euo pipefail

CLAUDE_CONFIG="$HOME/.claude.json"

if [ ! -f "$CLAUDE_CONFIG" ]; then
  echo "ERROR: ~/.claude.json not found. Run install.sh first."; exit 1
fi

echo ""
echo "Flexiele session refresh"
echo "------------------------"
echo "1. Go to https://feexotel.flexiele.com (stay logged in)"
echo "2. Open DevTools Console (Cmd+Opt+J)"
echo "3. Paste this one line:"
echo ""
echo "   fetch('https://raw.githubusercontent.com/shivanand-arch/flexiele-mcp/main/get-sessionid.js').then(r=>r.text()).then(eval)"
echo ""
echo "   → sessionId is now on your clipboard"
echo ""
read -r -p "4. Paste sessionId here: " SESSION_ID

if [ -z "$SESSION_ID" ]; then echo "ERROR: empty sessionId"; exit 1; fi

# Atomic patch — update only the sessionId env var
BACKUP="$CLAUDE_CONFIG.bak.$(date +%s)"
cp "$CLAUDE_CONFIG" "$BACKUP"
TMP=$(mktemp)

node - "$CLAUDE_CONFIG" "$SESSION_ID" "$TMP" <<'EOF'
const fs = require('fs');
const [,, cfg, sid, tmp] = process.argv;
const c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
if (!c.mcpServers?.flexiele) { console.error('flexiele MCP not found in config. Run install.sh first.'); process.exit(1); }
c.mcpServers.flexiele.env.FLEXIELE_SESSION_ID = sid;
fs.writeFileSync(tmp, JSON.stringify(c, null, 2));
EOF

mv "$TMP" "$CLAUDE_CONFIG"
echo ""
echo "✅ Session refreshed. Run /restart in Claude Code (or Cmd+R)."
