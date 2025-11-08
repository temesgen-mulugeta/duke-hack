# Canvas to LLM Integration - Implementation Summary

## Overview

This document describes the implementation of bidirectional communication between the Excalidraw canvas and the LLM (Large Language Model) via OpenAI's Realtime API.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Canvas         │         │  Express Server  │         │  Next.js Client │
│  (port 3000)    │◄───────►│  (port 3000)     │◄───────►│  (port 3001)    │
│                 │  WS     │                  │  WS     │                 │
│  Excalidraw UI  │         │  WebSocket Hub   │         │  RealtimePanel  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                                                          │
        │                 postMessage (iframe)                    │
        └─────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  OpenAI Realtime │
                          │       API        │
                          │  (GPT-4 Audio)   │
                          └──────────────────┘
```

## Communication Flows

### Flow 1: LLM → Canvas (Already Working)
1. User talks/types to LLM in RealtimePanel
2. LLM calls MCP tools (e.g., `create_element`)
3. MCP server sends HTTP request to Express server
4. Express server creates/updates elements
5. Express broadcasts via WebSocket to all clients
6. Canvas receives update and renders

### Flow 2: Canvas → LLM (Newly Implemented) ✅

We implemented **two parallel communication methods** for redundancy:

#### Method A: postMessage (iframe communication)
1. User draws on Canvas (Excalidraw `onChange` event)
2. Canvas detects changes (debounced 2 seconds)
3. Canvas sends `postMessage` to parent window
4. Next.js client receives message
5. RealtimePanel forwards to OpenAI Realtime API
6. LLM receives and can respond

#### Method B: WebSocket (via Express server)
1. User draws on Canvas (Excalidraw `onChange` event)
2. Canvas detects changes (debounced 2 seconds)
3. Canvas sends WebSocket message to Express server
4. Express server broadcasts `canvas_user_update` to all clients
5. Next.js client receives via WebSocket connection
6. RealtimePanel forwards to OpenAI Realtime API
7. LLM receives and can respond

## Implementation Details

### 1. Canvas Frontend (`frontend/src/App.tsx`)

**Added:**
- `onChange` handler for Excalidraw to detect user changes
- `describeCanvasChanges()` - Generates human-readable description of changes
- `sendCanvasUpdateViaPostMessage()` - Sends updates via iframe postMessage
- `sendCanvasUpdateViaWebSocket()` - Sends updates via WebSocket to Express
- `handleCanvasChange()` - Debounced handler (2-second delay)

**Key Features:**
- **Change Detection**: Tracks added, removed, and modified elements
- **Debouncing**: Waits 2 seconds after last change to avoid spam
- **Dual Communication**: Sends via both postMessage AND WebSocket
- **Natural Language**: Converts changes to readable descriptions

**Example Output:**
```
"User made changes to canvas: Added 2 element(s): rectangle, text; Modified 1 element(s)"
```

### 2. Express Server (`src/server.ts`)

**Added:**
- `ws.on('message')` handler to receive canvas updates from frontend
- Broadcasting logic for `canvas_user_update` message type

**Key Features:**
- Receives canvas updates from Canvas frontend
- Forwards to all connected WebSocket clients (including Next.js client)
- Logs all canvas user updates for debugging

### 3. Next.js Client Page (`client/src/app/page.tsx`)

**Added:**
- `canvasUpdates` state to track incoming updates
- `useEffect` hook to listen for postMessage events from iframe
- `useEffect` hook to create WebSocket connection to Express server
- Passes `canvasUpdates` prop to RealtimePanel

**Key Features:**
- **Dual Receivers**: Listens via both postMessage AND WebSocket
- **Deduplication**: Both methods update same state array
- **Connection Management**: Auto-reconnects WebSocket on failure

### 4. RealtimePanel (`client/src/components/RealtimePanel.tsx`)

**Added:**
- `canvasUpdates` prop interface
- `sendCanvasUpdateToLLM()` - Formats and sends updates to LLM
- `useEffect` hook to auto-forward new canvas updates
- Visual indicator showing recent canvas updates

**Key Features:**
- **Auto-forwarding**: Automatically sends new canvas updates to LLM
- **Deduplication**: Uses localStorage to avoid sending same update twice
- **LLM Integration**: Formats updates as natural language messages
- **Visual Feedback**: Shows update count and latest change in UI

**Message Format to LLM:**
```
"[Canvas Update] User made changes to canvas: Added 2 element(s): rectangle, text. Current canvas has 5 elements."
```

## Configuration

### Debounce Timing
Change in `frontend/src/App.tsx`:
```typescript
setTimeout(() => {
  // Send updates
}, 2000) // 2 seconds - adjust as needed
```

### postMessage Origin Security
For production, update in `client/src/app/page.tsx`:
```typescript
window.parent.postMessage(message, 'https://your-domain.com') // Specify origin
```

And add origin check:
```typescript
if (event.origin !== 'https://your-domain.com') return;
```

## Message Types

### Canvas Update Message (Canvas → LLM)
```typescript
{
  type: 'canvas_user_update',
  description: 'User made changes to canvas: Added 1 element(s): rectangle',
  elementCount: 5,
  elements: [/* full element data */],
  timestamp: '2025-11-08T12:34:56.789Z'
}
```

### LLM Response (LLM → Canvas)
LLM can respond by:
1. Acknowledging the change verbally/audio
2. Asking questions about the drawing
3. Calling MCP tools to modify the canvas
4. Providing suggestions or feedback

## Testing

### Test Flow 1: User draws, LLM acknowledges
1. Start both servers: `npm run dev` (canvas) and `cd client && npm run dev`
2. Open http://localhost:3001
3. Start Realtime session in RealtimePanel
4. Draw a shape on the canvas
5. Wait 2 seconds (debounce)
6. Check console: Should see "📤 Sent canvas update"
7. Check RealtimePanel: Should see "🎨 Sending canvas update to LLM"
8. LLM should respond acknowledging the change

### Test Flow 2: User draws, LLM modifies canvas
1. Draw multiple shapes
2. Wait for LLM response
3. Ask LLM: "What do you see on my canvas?"
4. LLM should describe your drawing
5. Ask LLM: "Can you add a circle next to my rectangle?"
6. LLM should call `create_element` tool and add the circle

## Debug Console Messages

**Canvas Frontend:**
```
📤 Sent canvas update via postMessage: User made changes to canvas...
📤 Sent canvas update via WebSocket: User made changes to canvas...
```

**Next.js Client (page.tsx):**
```
📨 Received canvas update via postMessage: {type: 'canvas_update', ...}
📨 Received canvas update via WebSocket: {type: 'canvas_user_update', ...}
```

**RealtimePanel:**
```
🎨 New canvas update detected: {description: '...', elementCount: 5}
🎨 Sending canvas update to LLM: [Canvas Update] User made changes...
```

**Express Server:**
```
Received WebSocket message: canvas_user_update
Canvas user update: User made changes to canvas...
```

## Advantages of Dual Communication

### postMessage (iframe)
✅ **Pros:**
- Direct communication (no network hop)
- Very low latency
- No extra WebSocket connection
- Works even if Express WebSocket is down

❌ **Cons:**
- Only works when canvas is in iframe
- Requires same-origin or CORS setup

### WebSocket (via Express)
✅ **Pros:**
- Works even if canvas and client are on different pages
- Can be monitored/logged server-side
- Can broadcast to multiple listeners
- More flexible for future features

❌ **Cons:**
- Requires extra WebSocket connection
- Slightly higher latency
- Depends on Express server

## Future Enhancements

1. **Selective Updates**: Only send significant changes (e.g., ignore minor position adjustments)
2. **Rich Context**: Send actual element data to LLM for deeper understanding
3. **Visual Context**: Send canvas screenshot to GPT-4 Vision
4. **Collaborative Features**: Multiple users drawing together with LLM assistance
5. **Update Filtering**: Allow users to enable/disable auto-forwarding to LLM
6. **Gesture Detection**: Detect specific drawing patterns (e.g., circle around text = highlight)

## Troubleshooting

### Canvas updates not reaching LLM

**Check 1: Console logs**
- Open browser DevTools → Console
- Draw something on canvas
- Look for "📤 Sent canvas update" messages

**Check 2: WebSocket connection**
- Look for "✅ Connected to Express WebSocket"
- If missing, check Express server is running on port 3000

**Check 3: RealtimePanel session**
- Ensure "Start Session" is clicked and status shows "Connected"
- Look for "🎨 Sending canvas update to LLM" in console

**Check 4: Debounce timing**
- Wait at least 2 seconds after drawing
- Updates are batched to avoid overwhelming the LLM

### LLM not responding to canvas updates

**Possible causes:**
- LLM might acknowledge silently or take time to process
- Check "Conversation" tab in RealtimePanel for text responses
- Try asking "Did you see my change?" to prompt a response
- Ensure tools are registered (check for "✓ X tools registered")

## Performance Considerations

- **Debounce delay (2s)**: Balances responsiveness vs. API calls
- **Full element data**: Sent but can be optimized to send only IDs/changes
- **LocalStorage check**: Prevents duplicate sends within same session
- **Dual sends**: Adds minimal overhead, ensures reliability

## Security Notes

⚠️ **Production Checklist:**
1. Change postMessage origin from `'*'` to specific domain
2. Add origin validation in message event handler
3. Consider rate limiting on canvas update endpoint
4. Add authentication for WebSocket connections
5. Validate/sanitize element data before broadcasting

## Summary

This implementation provides **robust, dual-path communication** from the Excalidraw canvas to the LLM:
- **Immediate**: postMessage for instant iframe communication
- **Reliable**: WebSocket via Express as backup/monitoring path
- **Smart**: Debounced, deduplicated, and naturally described
- **User-friendly**: Visual indicators and console logging

The LLM now receives real-time notifications about user drawings and can respond contextually, making it a true collaborative drawing assistant! 🎨✨

