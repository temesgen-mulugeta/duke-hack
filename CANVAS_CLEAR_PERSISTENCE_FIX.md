# Canvas Clear Persistence Fix

## Problem

When the user clicked "Clear Canvas" to remove all drawings, the canvas would be cleared successfully. However, when the page was refreshed, all the previously cleared elements would mysteriously reappear on the canvas.

## Root Cause

The issue was caused by the Express server's in-memory storage not being properly cleared:

1. **In-memory storage**: The Express server stores all canvas elements in a Map (`elements` in `src/types.ts`)
2. **Auto-restore on connect**: When a WebSocket connection is established, the server automatically sends all stored elements to the client (`src/server.ts` lines 70-74)
3. **Incomplete clear**: The old `clearCanvas()` function deleted elements one-by-one via individual DELETE requests, but this didn't always clear the server's in-memory storage completely
4. **Restoration on refresh**: When the page refreshed, the WebSocket reconnected and the server sent back all the stored elements

## Solution

### 1. Added Bulk DELETE Endpoint to Express Server

Created a new endpoint that clears all elements at once and properly clears the in-memory storage:

**File: `src/server.ts`**
```typescript
// Clear all elements
app.delete("/api/elements", (req: Request, res: Response) => {
  try {
    const count = elements.size;
    logger.info(`Clearing all elements: ${count} elements`);
    
    // Clear the in-memory storage
    elements.clear();

    // Broadcast to all connected clients to clear their canvas
    const message = {
      type: "elements_cleared",
      count: count,
      timestamp: new Date().toISOString(),
    };
    broadcast(message);

    res.json({
      success: true,
      message: `All ${count} elements cleared successfully`,
      count: count,
    });
  } catch (error) {
    logger.error("Error clearing all elements:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});
```

### 2. Updated Frontend to Handle Clear Event

Added handling for the `elements_cleared` WebSocket message:

**File: `frontend/src/App.tsx`**
```typescript
case "elements_cleared":
  console.log("Received clear all elements from server");
  // Mark as remote update to prevent onChange notification
  isApplyingRemoteUpdateRef.current = true;
  excalidrawAPI.updateScene({
    elements: [],
  });
  // Reset the flag after clearing
  if (remoteUpdateTimeoutRef.current) {
    clearTimeout(remoteUpdateTimeoutRef.current);
  }
  remoteUpdateTimeoutRef.current = setTimeout(() => {
    isApplyingRemoteUpdateRef.current = false;
    console.log("🔄 Canvas cleared by server, user changes will now be tracked");
  }, 500);
  break;
```

### 3. Updated Next.js Client Clear Function

Simplified the clear function to use the new bulk DELETE endpoint:

**File: `client/src/app/page.tsx`**
```typescript
const clearCanvas = async () => {
  try {
    console.log("🧹 Clearing canvas...");

    // Use the bulk DELETE endpoint to clear all elements at once
    const response = await fetch(`${canvasUrl}/api/elements`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (result.success) {
      console.log(
        `✅ Canvas cleared - removed ${result.count} element(s)`
      );
    } else {
      console.error("❌ Failed to clear canvas:", result.error);
    }
  } catch (error) {
    console.error("❌ Error clearing canvas:", error);
  }
};
```

### 4. Added MCP Tool for Clearing Canvas

Added a new `clear_canvas` tool so the AI can clear the canvas programmatically:

**File: `src/index.ts`**

Added to tools array:
```typescript
{
  name: 'clear_canvas',
  description: 'Clear all elements from the canvas - removes everything',
  inputSchema: {
    type: 'object',
    properties: {}
  }
}
```

Added handler:
```typescript
case 'clear_canvas': {
  logger.info('Clearing all canvas elements via MCP');
  
  try {
    // Clear all elements via bulk DELETE endpoint
    const response = await fetch(`${EXPRESS_SERVER_URL}/api/elements`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP server error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as any;
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to clear canvas');
    }

    logger.info('Canvas cleared successfully', {
      elementsRemoved: result.count
    });

    return {
      content: [{ 
        type: 'text', 
        text: `Canvas cleared successfully! Removed ${result.count} element(s).` 
      }]
    };
  } catch (error) {
    throw new Error(`Failed to clear canvas: ${(error as Error).message}`);
  }
}
```

## How It Works Now

1. User clicks "Clear Canvas" or switches topics
2. Next.js client calls `DELETE /api/elements` (bulk delete)
3. Express server:
   - Clears the in-memory `elements` Map
   - Broadcasts `elements_cleared` event to all WebSocket clients
   - Returns success response with count
4. All connected clients receive the WebSocket message and clear their canvas
5. When the page refreshes:
   - WebSocket reconnects
   - Server sends `initial_elements` (now empty)
   - Canvas stays empty ✅

## Testing

### Test Case 1: Clear Canvas and Refresh

1. Start the application
2. Draw some shapes on the canvas (or have the AI draw)
3. Click the topic menu and select a different topic (triggers clear)
4. Verify the canvas is cleared
5. Refresh the page (Cmd+R or F5)
6. ✅ **Expected**: Canvas remains empty

### Test Case 2: Clear Canvas Button

1. Open the Excalidraw canvas directly at `http://localhost:3000`
2. Draw some shapes
3. Click "Clear Canvas" button in the header
4. Verify the canvas is cleared
5. Refresh the page
6. ✅ **Expected**: Canvas remains empty

### Test Case 3: AI Using clear_canvas Tool

1. Start a learning session
2. Let the AI draw some shapes
3. Say "clear the canvas" or "start over"
4. AI should call the `clear_canvas` tool
5. ✅ **Expected**: Canvas is cleared immediately

### Test Case 4: Multiple Clients

1. Open the app in two browser windows
2. Draw shapes in window 1
3. Clear canvas in window 1
4. ✅ **Expected**: Canvas also clears in window 2 (via WebSocket broadcast)

## Files Modified

1. **src/server.ts** - Added bulk DELETE endpoint
2. **frontend/src/App.tsx** - Added handler for elements_cleared event
3. **client/src/app/page.tsx** - Updated clearCanvas function
4. **src/index.ts** - Added clear_canvas MCP tool and handler

## Benefits

- ✅ Canvas clearing now works correctly across page refreshes
- ✅ More efficient (one bulk operation vs. many individual deletes)
- ✅ Proper WebSocket synchronization across multiple clients
- ✅ AI can now clear the canvas when needed
- ✅ Better user experience with reliable canvas clearing

