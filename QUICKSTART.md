# Quick Start Guide - Updated Realtime Console

## Prerequisites

1. **OpenAI API Key**: Set your OpenAI API key in environment variables
2. **MCP Excalidraw Server**: Have the Excalidraw MCP server running
3. **Node.js and pnpm**: Ensure you have Node.js 18+ and pnpm installed

## Setup

### 1. Install Dependencies

```bash
cd client
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `client` directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3000
```

### 3. Start the MCP Server

Make sure your Excalidraw MCP server is running on the configured port (default: 3000).

### 4. Start the Client

```bash
pnpm dev
```

The client will run on http://localhost:3001

## Usage

### Starting a Realtime Session

1. **Open the application** at http://localhost:3001
2. **Click "start session"** button
3. **Allow microphone access** when prompted
4. Wait for the connection to establish (status will show "Listening")

### Sending Messages

**Text Input:**
- Type your message in the input field
- Press Enter or click "send text"
- The message will appear in the event log

**Voice Input:**
- Simply speak into your microphone
- The assistant will respond with both voice and text

### Using Tools

Ask the assistant to draw or modify the canvas:

**Example prompts:**
- "Draw a red circle"
- "Add a text box that says Hello World"
- "Create a flowchart with three steps"
- "Draw a diagram showing client-server architecture"

The assistant will use the available MCP tools to modify the Excalidraw canvas.

### Monitoring Activity

**Event Log (left panel):**
- Shows all communication between client and server
- Blue arrows (▼) = client events
- Green arrows (▲) = server events
- Click on any event to expand and see full JSON

**Tool Panel (right sidebar):**
- Shows the most recent tool call
- Displays tool name, call ID, and arguments
- Updates in real-time as tools are executed

### Stopping the Session

Click the **"disconnect"** button to stop the session and close all connections.

## Troubleshooting

### Microphone Not Working
- Check browser permissions for microphone access
- Ensure you're using HTTPS or localhost
- Try refreshing the page and starting a new session

### Connection Failed
- Verify your OpenAI API key is correct
- Check network connectivity
- Look at browser console for detailed error messages
- Check the event log for error events

### Tools Not Executing
- Ensure the MCP server is running
- Check the MCP server URL in environment variables
- Look at the event log for tool-related errors
- Check browser console for API errors

### No Audio Output
- Check browser audio permissions
- Verify your speakers/headphones are working
- Check browser console for audio-related errors

## Development Tips

### Viewing Raw Events

Click on any event in the Event Log to see the full JSON payload. This is useful for:
- Debugging tool calls
- Understanding the conversation flow
- Seeing model responses
- Troubleshooting errors

### Testing Without Voice

You can test the entire system using just text messages. The voice features are optional.

### Clearing the Session

To start fresh:
1. Click "disconnect"
2. Click "start session" again
3. A new session with empty history will begin

## Architecture Overview

```
Browser                Client (Next.js)           OpenAI                MCP Server
   |                          |                      |                       |
   |-- Microphone ----------->|                      |                       |
   |                          |-- WebRTC SDP ------->|                       |
   |                          |<-- WebRTC SDP -------|                       |
   |                          |                      |                       |
   |                          |-- Send Message ----->|                       |
   |                          |<-- Response ---------|                       |
   |                          |<-- Tool Call --------|                       |
   |                          |-- Execute Tool ----------------->|           |
   |                          |<-- Tool Result ------------------|           |
   |                          |-- Tool Output ------>|                       |
   |<-- Audio/Text Response --|<-- Response ---------|                       |
```

## API Endpoints

- **GET `/api/realtime/token`** - Get ephemeral OpenAI API key
- **POST `/api/realtime/session`** - Get available MCP tools
- **POST `/api/realtime/tool`** - Execute an MCP tool

## Browser Support

- Chrome/Edge 90+ (recommended)
- Firefox 88+
- Safari 14.1+

Note: WebRTC and microphone access are required, so older browsers may not work.

## Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)

## Support

For issues or questions:
1. Check the Event Log for error messages
2. Look at browser console (F12) for detailed errors
3. Review the REALTIME_UPDATE_SUMMARY.md for implementation details

