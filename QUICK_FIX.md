# Quick Fix - Build and Run the MCP Server

## The Main Issue

The MCP server needs to be **built** before the realtime client can connect to it. The file `dist/index.js` doesn't exist yet.

## Steps to Fix

### 1. Build the MCP Server (from project root)

```bash
cd /Users/teme/MyFiles/Dev/Duke/hack-projects/mcp_excalidraw
npm run build:server
```

This will compile TypeScript → JavaScript in the `dist/` folder.

### 2. Start the Canvas Server (from project root)

```bash
npm run canvas
```

This starts the Express server at http://localhost:3000 with the Excalidraw UI.

**Keep this running in one terminal.**

### 3. Start the Next.js Client (from client folder)

```bash
cd client
pnpm dev
```

**Keep this running in another terminal.**

### 4. Test the Realtime Integration

1. Open http://localhost:3001 (or whatever port Next.js is on)
2. Click "Start Session"
3. Look at the console - you should see:
   ```
   ✅ Successfully connected to MCP server!
   ✅ Retrieved 8 tools from MCP server
   ```
4. Say or type: **"draw a red circle"**
5. Watch the console for:
   ```
   🔧 Function call detected
   ✅ Tool execution successful!
   ```

## What Was Fixed

### 1. **Session Configuration**
- Fixed the `session.update` format to match OpenAI's expectations
- Added proper `modalities` and `turn_detection` config
- Removed extra fields that OpenAI doesn't expect

### 2. **Function Call Handling**
- Simplified to handle the correct events: `response.function_call_arguments.done`
- Added deduplication to prevent processing the same call twice
- Better error handling and logging

### 3. **Instructions**
- Stronger directives telling the model it MUST use tools
- Explicit examples showing exact function calls
- Clearer language about acting vs. describing

### 4. **Comprehensive Logging**
Every layer now has detailed logs:
- ✅ MCP client connection
- ✅ Tool registration
- ✅ Function call detection
- ✅ Tool execution
- ✅ Results sent back to model

## Quick Test Commands

### Build everything:
```bash
cd /Users/teme/MyFiles/Dev/Duke/hack-projects/mcp_excalidraw
npm run build
```

### Run servers (3 terminals):

**Terminal 1 - Canvas Server:**
```bash
cd /Users/teme/MyFiles/Dev/Duke/hack-projects/mcp_excalidraw
npm run canvas
```

**Terminal 2 - Next.js Client:**
```bash
cd /Users/teme/MyFiles/Dev/Duke/hack-projects/mcp_excalidraw/client
pnpm dev
```

**Terminal 3 - Watch for changes (optional):**
```bash
cd /Users/teme/MyFiles/Dev/Duke/hack-projects/mcp_excalidraw
npm run dev:server
```

## Debugging

If you still see issues, check the console logs:

### Browser Console (F12):
- Connection status
- Tool registration
- Function calls

### Terminal (Next.js):
- MCP client connection
- Tool execution
- API errors

See `REALTIME_DEBUG_GUIDE.md` for detailed troubleshooting.

## Success!

You'll know it's working when:
1. ✅ Session connects
2. ✅ Tools registered (see "✓ 8 tools registered")
3. ✅ Asking to draw triggers a function call
4. ✅ Console shows tool execution success
5. ✅ Model confirms the drawing

## Changed Files

All changes preserve existing functionality and only add:
- Better session configuration
- Improved function call handling
- Comprehensive logging
- Stronger instructions

**No breaking changes!**

