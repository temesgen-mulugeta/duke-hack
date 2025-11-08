## MCP Realtime Client

This application turns the Next.js UI into a Model Context Protocol (MCP) client that:

- Launches the local `mcp_excalidraw` MCP server over stdio
- Provisions an ephemeral OpenAI Realtime WebRTC session
- Bridges tool calls from the LLM to the Excalidraw canvas hosted at `CANVAS_URL`

The landing page now includes:

- A **Realtime Assistant** panel with a button to start a WebRTC session
- Live transcript, tool output log, and raw event stream for debugging
- The original Excalidraw iframe and Mermaid smoke test

## Prerequisites

1. Build the MCP server at the repository root:

   ```bash
   pnpm install
   pnpm run build
   ```

   The Next.js client spawns `../dist/index.js` by default. Override with `MCP_SERVER_SCRIPT` if needed.

2. Ensure the canvas server (Express/WebSocket) is running. By default we embed `http://localhost:3000`.

3. Create a `.env.local` inside `client/` with the required secrets:

   ```bash
   OPENAI_API_KEY=sk-...
   OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
   OPENAI_REALTIME_SESSION_URL=https://api.openai.com/v1/realtime/sessions
   NEXT_PUBLIC_OPENAI_REALTIME_URL=https://api.openai.com/v1/realtime

   # Canvas + MCP overrides (optional)
   NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3000
   MCP_CANVAS_URL=http://localhost:3000
   MCP_SERVER_COMMAND=node
   MCP_SERVER_SCRIPT=/absolute/path/to/dist/index.js
   ```

   - `OPENAI_API_KEY` must stay server-side (do **not** prefix with `NEXT_PUBLIC_`).
   - `MCP_CANVAS_URL` is forwarded to the MCP server process as `EXPRESS_SERVER_URL`.

## Running the client

```bash
pnpm install
pnpm dev
```

Navigate to [http://localhost:3001](http://localhost:3001) (the dev server runs on port `3001` as defined in `package.json`).

## Using the Realtime panel

1. Click **Start Conversation**. The client will:
   - Fetch an ephemeral session from `/api/realtime/session`
   - Establish a WebRTC connection with the OpenAI Realtime API
   - Stream MCP tool calls to `/api/realtime/tool`

2. Watch the transcript, tool outputs, and raw event log update live.

3. Use the Mermaid quick test to push a sample diagram to the canvas.

If you need to restart the MCP server, stop the Next.js process so the stdio transport can reclaim the process on next start.

## Troubleshooting

- `OPENAI_API_KEY is not configured`: ensure the key is present in `.env.local`.
- `Failed to create realtime session`: verify your OpenAI account has access to the Realtime API and the model name is correct.
- Tool calls timing out: confirm the MCP server can start (`node dist/index.js`) and that `MCP_SERVER_SCRIPT` points to the compiled file.
