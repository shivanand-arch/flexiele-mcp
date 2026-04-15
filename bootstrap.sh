#!/usr/bin/env bash
# Flexiele MCP — one-shot bootstrap
# Usage: curl -fsSL <url>/bootstrap.sh | bash
set -euo pipefail

REPO_URL="${FLEXIELE_REPO_URL:-https://github.com/shivanand-arch/flexiele-mcp.git}"
INSTALL_DIR="${FLEXIELE_INSTALL_DIR:-$HOME/flexiele-mcp}"

echo ""
echo "================================================"
echo "  Flexiele HRMS MCP — Bootstrap"
echo "================================================"
echo ""

# 1. Check Node
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found."
  echo "  Install: brew install node    (or https://nodejs.org)"
  exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node $NODE_MAJOR detected. Need Node 18+."
  exit 1
fi

# 2. Check git
if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git not found. Install Xcode Command Line Tools: xcode-select --install"
  exit 1
fi

# 3. Check Claude Code config exists
if [ ! -f "$HOME/.claude.json" ]; then
  echo "ERROR: ~/.claude.json not found. Install Claude Code first: https://claude.ai/code"
  exit 1
fi

# 4. Clone or update repo
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "[..] Updating existing checkout at $INSTALL_DIR"
  git -C "$INSTALL_DIR" pull --ff-only
else
  if [ -e "$INSTALL_DIR" ]; then
    echo "ERROR: $INSTALL_DIR exists and is not a git repo. Move it aside and retry."
    exit 1
  fi
  echo "[..] Cloning $REPO_URL → $INSTALL_DIR"
  git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
fi

# 5. Delegate to install.sh
cd "$INSTALL_DIR"
exec bash install.sh
