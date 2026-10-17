# chatgpt-plugin

`server.js` is the Node reference MCP server (uses `@modelcontextprotocol/sdk`
over streamable HTTP). It is the source of truth for the tool names, schemas,
annotations, the `FIXES` prompts and the passive `checkApp` logic.

The production version runs as a Cloudflare Worker in `../workers/mcp/`
(`worker.js`), which ports this file to the Workers runtime (no `node:*`
modules, a minimal stateless JSON-RPC handler, a KV per-IP rate limit).

`plugin.json`, `mcp.json`, `skills/` and `assets/` were referenced but not
provided, so they are not in the repo yet.
