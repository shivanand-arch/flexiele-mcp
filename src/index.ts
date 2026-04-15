import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FlexieleClient } from "./flexiele-client.js";
import { registerTools } from "./tools.js";

const sessionId = process.env.FLEXIELE_SESSION_ID;

if (!sessionId) {
  console.error(
    "Error: FLEXIELE_SESSION_ID environment variable is required.\n" +
      "Set it to the fe_session_id cookie value from your Flexiele session.\n" +
      'It looks like: s:xxxxxxxx.yyyyyyyy (get it from browser userInfo response → sessionId field)'
  );
  process.exit(1);
}

const server = new McpServer({
  name: "flexiele-hrms",
  version: "1.0.0",
});

const client = new FlexieleClient(sessionId);

registerTools(server, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Flexiele HRMS MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
