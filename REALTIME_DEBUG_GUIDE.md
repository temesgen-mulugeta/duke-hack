# Realtime API + MCP Integration - Debug Guide

## Issues Fixed

### 1. **Session Configuration**
**Problem**: The `session.update` was including extra fields that OpenAI doesn't expect, and missing important configuration.

**Fix**: 
- Removed `event_id` and `timestamp` from the actual session update sent to OpenAI
- Added `modalities: ["text", "audio"]` to explicitly enable both modes
- Enhanced turn detection configuration with proper thresholds
- Send these fields only to the local event log for display purposes

### 2. **Function Call Detection**
**Problem**: Function calls were being handled in 3 different event types, potentially causing duplicates or missing calls.

**Fix**:
- Simplified to primarily handle `response.function_call_arguments.done` (the canonical event)
- Added `response.output_item.done` as a fallback
- Implemented deduplication using a `Set` to track processed call IDs
- Removed `conversation.item.created` handler (unreliable for function calls)

### 3. **Improved Instructions**
**Problem**: Instructions weren't strong enough to force the model to use tools.

**Fix**:
- Rewrote instructions with stronger imperative language
- Added explicit "MUST" and "DO NOT" directives
- Included concrete examples showing exact tool calls
- Made it clear the assistant should act, not just describe

### 4. **Comprehensive Logging**
**Problem**: No visibility into where the integration was failing.

**Fix**: Added detailed logging at every layer:
- **Frontend (RealtimePanel)**: Function call detection and handling
- **Backend API routes**: Tool execution requests
- **MCP Client**: Connection status and tool calls
- All logs use consistent formatting with emojis for easy scanning

## How to Debug

### Step 1: Start the MCP Server
The MCP Excalidraw server must be running. Check the logs:

```bash
# If running the canvas separately
cd /path/to/mcp_excalidraw
npm run build
npm run canvas

# In another terminal, verify the MCP server can be started
node dist/index.js
```

You should see logs indicating the server started successfully.

### Step 2: Start the Next.js Client
```bash
cd client
pnpm dev
```

Open your browser console (F12) to see detailed logs.

### Step 3: Check Session Initialization

When you click "Start Session", you should see logs like:

```
========================================
🔧 REALTIME SESSION SETUP
========================================
📡 Fetching tools from MCP Excalidraw client...
🔌 CREATING MCP CLIENT
========================================
...
✅ Successfully connected to MCP server!
...
✅ Retrieved 8 tools from MCP server
```

**If you see connection errors**: The MCP server isn't accessible. Check:
- Is the MCP server script at the correct path? (Check `defaultScriptPath` in `excalidrawClient.ts`)
- Is Node.js installed and accessible?
- Check environment variables in the server parameters

### Step 4: Verify Tools Registration

After the data channel opens, you should see:

```
📋 SESSION UPDATE PAYLOAD:
- Tool count: 8
- Tool names: [array of tool names]
- Tool choice: auto
```

Then from OpenAI:

```
📨 Received event: session.updated
✅ Session updated! Tools registered: 8
```

**If you don't see `session.updated`**: OpenAI didn't acknowledge the tools. Check:
- Is your OpenAI API key valid?
- Are the tools formatted correctly? (Check the console output)
- Is the WebRTC connection established?

### Step 5: Test Tool Usage

Send a message like: **"draw a red circle"**

You should see:

```
📨 Received event: response.created
🎤 Model is generating a response
...
📨 Received event: response.function_call_arguments.done
🔧 Function call detected (arguments.done): {...}

========================================
🔧 HANDLING FUNCTION CALL
========================================
📋 Full item received: {
  "call_id": "...",
  "name": "create_element",
  "arguments": "{\"type\":\"ellipse\",...}"
}
...
✅ Tool execution successful!
```

**If the model doesn't call a tool**: 
- Check if it's responding with text instead
- The instructions might not be strong enough, or the model doesn't think a tool is needed
- Try being more explicit: "use the create_element tool to draw a red circle"

**If you see function call detected but execution fails**:
- Check the MCP client connection logs
- Verify the tool arguments are valid
- Check if the canvas server is running (http://localhost:3000)

## Common Issues

### Issue: "Model just describes what it would draw"
**Solution**: The model is being polite instead of acting. Try:
- "draw a circle now"
- "create a rectangle using your tool"
- Check that `tool_choice: "auto"` is set (not "none")

### Issue: "Error: Unable to list tools"
**Solution**: MCP client can't connect to the server.
- Check the MCP server path in `excalidrawClient.ts`
- Verify `node` is in your PATH
- Try running the server manually to see errors

### Issue: "Function call detected but no result"
**Solution**: The tool execution is failing.
- Check the backend logs (terminal running `pnpm dev`)
- Verify the canvas server is running
- Check MCP client logs for connection issues

### Issue: "Tools registered but model never calls them"
**Solution**: 
- The model needs a clearer prompt
- Try: "you must use your create_element tool to draw a red circle"
- Check if `tool_choice` is set correctly in the session update

## Monitoring

### Browser Console
- All frontend events and function calls
- WebRTC connection status
- Tool execution results

### Terminal (Next.js server)
- MCP client connection
- Tool execution on the backend
- API route handling

### Network Tab
- Check `/api/realtime/session` for tool list
- Check `/api/realtime/tool` for execution requests
- Look for any 500 errors

## Testing Checklist

- [ ] MCP server starts without errors
- [ ] Next.js client starts successfully
- [ ] Session connects and shows "Connected" status
- [ ] Tools are registered (see "✓ 8 tools registered")
- [ ] Sending a message gets a voice/text response
- [ ] Asking to draw triggers a function call
- [ ] Function call executes successfully
- [ ] Tool result is sent back to the model
- [ ] Model acknowledges the drawing

## Architecture Flow

```
User: "draw a circle"
    ↓
1. OpenAI Realtime API receives message
    ↓
2. Model decides to call create_element tool
    ↓
3. Event: response.function_call_arguments.done
    ↓
4. Frontend: handleFunctionCall() triggered
    ↓
5. POST /api/realtime/tool with tool name + args
    ↓
6. Backend: callExcalidrawTool()
    ↓
7. MCP Client: client.callTool()
    ↓
8. MCP Server: executes tool, updates canvas
    ↓
9. Result sent back through the chain
    ↓
10. Frontend: sends function_call_output to OpenAI
    ↓
11. Model: "I've drawn a red circle for you"
```

## Key Files

- `client/src/components/RealtimePanel.tsx` - Main realtime UI and logic
- `client/src/app/api/realtime/session/route.ts` - Tool registration
- `client/src/app/api/realtime/tool/route.ts` - Tool execution endpoint
- `client/src/lib/mcp/excalidrawClient.ts` - MCP client wrapper
- `dist/index.js` - MCP server (must be built first)

## Next Steps If Still Not Working

1. **Enable verbose logging**: Check all console logs in order
2. **Test MCP directly**: Try calling tools via the test panel
3. **Verify OpenAI API**: Test with a simple non-tool message first
4. **Check tool schemas**: Ensure they match OpenAI's function calling format
5. **Try explicit tool choice**: Change `tool_choice: "auto"` to `tool_choice: { type: "function", function: { name: "create_element" } }`

## Environment Variables

Make sure these are set:

```bash
OPENAI_API_KEY=sk-...  # Required for realtime API
EXPRESS_SERVER_URL=http://localhost:3000  # Canvas server
ENABLE_CANVAS_SYNC=true  # Enable real-time updates
```

## Success Indicators

✅ Session connects successfully
✅ Tools are registered (see count in UI)
✅ Model responds to messages
✅ Function calls are detected in console
✅ Tools execute without errors
✅ Canvas updates with drawings
✅ Model acknowledges the drawing

If all of these work, your integration is successful!

