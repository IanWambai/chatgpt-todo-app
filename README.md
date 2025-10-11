# To-Do App (ChatGPT Apps SDK + MCP Server)

An end-to-end example that renders a React to-do widget inside ChatGPT using the Apps SDK, backed by a local MCP server over Streamable HTTP.

- Frontend: `web/` (TypeScript + React 18, bundled with esbuild)
- Backend: `server/` (Express + `@modelcontextprotocol/sdk` Streamable HTTP)

---

## Prerequisites
- Node.js 18+
- Optional: ngrok (HTTPS tunnel for ChatGPT)

```bash
# check
node -v
# install ngrok (Homebrew)
brew install ngrok
```

---

## Project Structure
```
./
├─ web/
│  ├─ src/component.tsx        # React widget that talks to window.openai
│  ├─ tsconfig.json            # TS config (React JSX, bundler module resolution)
│  └─ dist/component.js        # Bundled output (built by esbuild)
└─ server/
   └─ server.mjs               # Express + MCP Streamable HTTP server
```

---

## Install & Build
The repo is already scaffolded. If you modify the frontend, rebuild:

```bash
# from web/
npm install
npm run build
```

> The build command bundles `src/component.tsx` to `dist/component.js`.

---

## Run the MCP Server
```bash
# from server/
npm install
node server.mjs
# Expected log:
# MCP server running on http://localhost:3000/mcp
```

---

## Validate Locally (MCP Inspector)
```bash
# from project root or anywhere
npx @modelcontextprotocol/inspector
# Open the URL it prints (with the auth token query param)
# In the Inspector:
#  - Transport Type: Streamable HTTP
#  - URL: http://localhost:3000/mcp
#  - Connection Type: Via Proxy
#  - Connect and call tools
```

---

## Expose HTTPS for ChatGPT (ngrok)
```bash
ngrok http 3000
# copy the HTTPS URL it prints, e.g.
# https://<subdomain>.ngrok-free.app
```
Your Connector URL will be:
```
https://<subdomain>.ngrok-free.app/mcp
```

---

## Connect in ChatGPT (Developer Mode)
1. Settings → Connectors → Advanced → enable Developer mode.
2. Connectors → Create:
   - Name: To-Do App
   - Description: Interactive to-do list that lets me add/toggle/delete tasks.
   - Connector URL: `https://<subdomain>.ngrok-free.app/mcp`
   - Authentication: None
3. Save.
4. New chat → click + near the composer → Developer mode → toggle on “To-Do App”.
5. Prompt: “Use the To-Do App to open my task list.”

---

## How It Works
- The MCP server registers:
  - Resource template `ui://widget/todo.html` with `mimeType: text/html+skybridge` that inlines the bundled widget.
  - Tools: `todos_app`, `todo_add`, `todo_toggle`, `todo_delete` (marked `openai/widgetAccessible` so the widget can call them).
- The React component uses `window.openai.callTool(...)`, listens for `openai:set_globals`, and can request fullscreen via `requestDisplayMode`.

---

## Troubleshooting
- "Error fetching OAuth configuration": set Authentication to None in the ChatGPT connector.
- HTTP 424 / first-call failures: ensure the server and ngrok are both running; retry.
- Schema errors (`_def` / `keyValidator._parse`):
  - This project pins a stable `@modelcontextprotocol/sdk` and uses simple tool schemas to avoid regressions.
- If ngrok URL changes: update the Connector URL in ChatGPT to the new `https://<subdomain>.ngrok-free.app/mcp`.

### Quick cURL checks
```bash
# list tools (local)
curl -sS -H 'Accept: application/json, text/event-stream' -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' \
  http://localhost:3000/mcp | jq .

# call add (over ngrok)
# replace with your https URL
tunnel="https://<subdomain>.ngrok-free.app/mcp"
curl -sS -H 'Accept: application/json, text/event-stream' -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"todo_add","arguments":{"text":"shopping"}}}' \
  "$tunnel" | jq .
```

---

## Development Notes
- Frontend uses React 18 with `react-jsx` transform; no extra JSX runtime import required.
- Server is ESM (`server.mjs`), imports SDK `StreamableHTTPServerTransport` and `McpServer`.
- In-memory store only (ephemeral). To persist, write to a file or DB in the tool handlers.

---

## Next Steps
- Persist todos to disk/DB.
- Add authentication if multi-user identity is needed.
- Version UI bundles via distinct resource URIs to avoid cache collisions.
