# Screenshot Tool for Excalidraw Canvas

## Overview

The `capture_canvas_screenshot` tool allows LLMs to capture and view what the user has drawn on the Excalidraw canvas. This enables the AI to see the visual content and provide better assistance based on the current state of the drawing.

## How It Works

The screenshot tool uses a request-response pattern via WebSockets:

1. **MCP Server**: The LLM calls the `capture_canvas_screenshot` tool
2. **Express Server**: Receives the request and broadcasts it to the frontend via WebSocket
3. **Frontend**: Captures the canvas using Excalidraw's export API and sends the image back
4. **Express Server**: Receives the screenshot and returns it to the MCP server
5. **MCP Server**: Returns the screenshot to the LLM as an image

## Architecture

```
LLM → MCP Server → Express Server (API + WebSocket) → Frontend (Excalidraw)
                                                            ↓
LLM ← MCP Server ← Express Server (WebSocket) ← Screenshot Data
```

## Tool Usage

### Tool Name
`capture_canvas_screenshot`

### Parameters

- `format` (optional): Screenshot format, either `'png'` or `'svg'`
  - Default: `'png'`
- `quality` (optional): Image quality for PNG format (0-1)
  - Default: `1` (highest quality)
  - Only applies to PNG format

### Example Usage

#### From an LLM (via MCP)

```json
{
  "tool": "capture_canvas_screenshot",
  "arguments": {
    "format": "png",
    "quality": 0.9
  }
}
```

#### Response

The tool returns an image that the LLM can view:
- PNG format: Base64-encoded PNG image
- SVG format: Base64-encoded SVG XML

## Implementation Details

### Files Modified

1. **src/index.ts**: Added the MCP tool definition and handler
2. **src/server.ts**: Added API endpoint and WebSocket message handling
3. **src/types.ts**: Added new WebSocket message types
4. **frontend/src/App.tsx**: Added screenshot capture functionality

### Key Components

#### 1. MCP Tool Handler (`src/index.ts`)

```typescript
case 'capture_canvas_screenshot': {
  const params = z.object({
    format: z.enum(['png', 'svg']).optional().default('png'),
    quality: z.number().min(0).max(1).optional().default(1)
  }).parse(args || {});
  
  // Request screenshot from the frontend via HTTP API
  const response = await fetch(`${EXPRESS_SERVER_URL}/api/canvas/screenshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  // Returns image data to LLM
}
```

#### 2. Express API Endpoint (`src/server.ts`)

```typescript
app.post("/api/canvas/screenshot", (req: Request, res: Response) => {
  const { format = 'png', quality = 1 } = req.body;
  const requestId = generateId();
  
  // Store response object for async reply
  pendingScreenshotRequests.set(requestId, res);
  
  // Broadcast request to frontend
  broadcast({
    type: "screenshot_request",
    requestId,
    format,
    quality,
    timestamp: new Date().toISOString(),
  });
  
  // 30-second timeout
  setTimeout(() => { /* timeout handling */ }, 30000);
});
```

#### 3. Frontend Screenshot Capture (`frontend/src/App.tsx`)

```typescript
const handleScreenshotRequest = async (data: any) => {
  const { requestId, format = 'png', quality = 1 } = data;
  
  if (format === 'svg') {
    // Export as SVG
    const svg = await excalidrawAPI.exportToSvg({
      elements: excalidrawAPI.getSceneElements(),
    });
    const svgString = new XMLSerializer().serializeToString(svg);
    screenshotData = btoa(unescape(encodeURIComponent(svgString)));
  } else {
    // Export as PNG
    const blob = await excalidrawAPI.exportToBlob({
      elements: excalidrawAPI.getSceneElements(),
      mimeType: 'image/png',
      quality,
    });
    screenshotData = await blobToBase64(blob);
  }
  
  // Send response back via WebSocket
  sendScreenshotResponse(requestId, true, screenshotData, null, format);
};
```

## Testing

### Manual Testing

1. Start the Express server:
   ```bash
   npm run start
   ```

2. Open the canvas in a browser:
   ```
   http://localhost:3000
   ```

3. Draw something on the canvas

4. From an MCP client (e.g., Claude Desktop), call the tool:
   ```
   Use the capture_canvas_screenshot tool to see what I've drawn
   ```

### Expected Behavior

- The LLM should receive a screenshot of the current canvas
- The screenshot should show all elements drawn by the user
- PNG format provides a bitmap image
- SVG format provides vector graphics (smaller file size, scalable)

## Troubleshooting

### Screenshot Timeout

If you get a timeout error:
- Ensure the frontend is loaded and connected via WebSocket
- Check the browser console for errors
- Verify the Express server is running on port 3000

### Empty Screenshot

If the screenshot is blank:
- Check that elements are actually present on the canvas
- Verify the Excalidraw API is properly initialized
- Look for errors in the browser console

### WebSocket Connection Issues

If screenshots aren't being captured:
- Check WebSocket connection status in the browser console
- Ensure no firewall is blocking WebSocket connections
- Verify the correct WebSocket URL is being used

## Future Enhancements

Possible improvements:
- Add support for capturing only selected elements
- Allow specifying a custom viewport/zoom level
- Add annotations or highlights to the screenshot
- Support for different background colors
- Capture with or without the UI elements

