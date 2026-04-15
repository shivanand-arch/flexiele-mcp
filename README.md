# Flexiele HRMS MCP

Ask Claude natural-language questions about Exotel's org: reporting chains, spans of control, headcount by unit/office, direct reports, depth — live from Flexiele.

## 2-minute setup

**Prereqs:** Node 18+ (`brew install node`), [Claude Code](https://claude.ai/code).

**1. Grab your Flexiele sessionId.** Log into https://feexotel.flexiele.com, open DevTools Console (Cmd+Opt+J), paste the contents of [`get-sessionid.js`](./get-sessionid.js). Your sessionId is copied to the clipboard.

**2. Install.** In Terminal:
```bash
curl -fsSL https://raw.githubusercontent.com/shivanand-arch/flexiele-mcp/main/bootstrap.sh | bash
```
Paste the sessionId when prompted.

**3. Restart Claude Code.**

Done. Try asking:
- *Who has the most direct reports at Exotel?*
- *Show me Anuja Dhawan's reporting chain.*
- *Headcount breakdown by office.*
- *How deep is the org under Customer Operations?*

## How it works

Runs locally on your Mac. Uses your own Flexiele session — no credentials stored centrally, nothing proxied, no new vendor spend.

## Tools exposed

| Tool | Purpose |
|---|---|
| `get_org_tree` | Full org tree or a subtree |
| `get_employee_info` | Your logged-in user info |
| `search_employee` | Fuzzy search by name |
| `get_direct_reports` | Direct reports of an empId |
| `get_reporting_chain` | Upward manager chain |
| `get_org_stats` | Headcount + breakdowns by unit / office / position |

## Refreshing your sessionId

Sessions expire. When queries start failing with auth errors:
1. Re-run the sessionId snippet in Chrome DevTools
2. Run `bash ~/flexiele-mcp/install.sh` and paste the new sessionId
3. Restart Claude Code

## Troubleshooting

- **"Flexiele API error: 401"** — sessionId expired, refresh (above).
- **Claude doesn't see the MCP** — fully quit and relaunch Claude Code.
- **Verify it's registered** — `grep -A4 flexiele ~/.claude.json`
- **Manual sessionId fallback** — DevTools → Network → reload page → find `userInfo` request → Response tab → copy `sessionId`.

## Owner

Shivanand Shahapur — bugs / feature requests.
