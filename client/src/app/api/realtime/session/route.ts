import { NextResponse } from "next/server";

import { listExcalidrawTools } from "@/lib/mcp/excalidrawClient";

export async function POST() {
  console.log("\n========================================");
  console.log("🔧 REALTIME SESSION SETUP");
  console.log("========================================");
  
  try {
    console.log("📡 Fetching tools from MCP Excalidraw client...");
    const startTime = Date.now();
    
    // Just return the tools list - the WebRTC connection will be handled client-side
    const tools = await listExcalidrawTools();
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Tool fetch took ${duration}ms`);
    console.log(`✅ Retrieved ${tools.length} tools from MCP server`);
    console.log("Available tools:", tools.map(t => t.name).join(", "));

    const realtimeTools = tools.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description || `MCP tool: ${tool.name}`,
      parameters: tool.inputSchema ?? {
        type: "object",
        properties: {},
      },
    }));

    console.log("\n📋 Formatted tools for OpenAI Realtime API:");
    console.log(JSON.stringify(realtimeTools, null, 2));
    console.log("========================================\n");

    return NextResponse.json({
      tools: realtimeTools,
      instructions:
        "You are an Excalidraw drawing assistant with access to powerful drawing tools.\n\n" +
        "CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:\n" +
        "1. When the user asks you to draw, create, add, or make ANY visual element, you MUST immediately call one of your tools\n" +
        "2. DO NOT just describe what you would draw - you MUST actually use the tool to draw it\n" +
        "3. DO NOT say things like 'I would draw' or 'I can create' - just call the tool and do it\n" +
        "4. After the tool executes successfully, briefly confirm what you drew\n\n" +
        "AVAILABLE TOOLS:\n" +
        "- create_element: Draw a single shape (rectangle, ellipse, diamond, line, arrow, text)\n" +
        "- batch_create_elements: Draw multiple shapes at once\n" +
        "- create_from_mermaid: Convert Mermaid diagram syntax to Excalidraw\n" +
        "- list_elements: See what's currently on the canvas\n" +
        "- update_element: Modify an existing shape\n" +
        "- delete_element: Remove a shape\n" +
        "- clear_canvas: Clear everything\n\n" +
        "EXAMPLES:\n" +
        "- User: 'draw a red circle' → IMMEDIATELY call create_element with {type:'ellipse', strokeColor:'#ff0000', x:100, y:100, width:100, height:100}\n" +
        "- User: 'create a flowchart' → IMMEDIATELY call create_from_mermaid or batch_create_elements\n" +
        "- User: 'add a square' → IMMEDIATELY call create_element with {type:'rectangle', ...}\n\n" +
        "Remember: Your job is to DRAW using the tools, not to talk about drawing!",
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ SESSION SETUP FAILED");
    console.error("========================================");
    console.error("Error details:", error);
    
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("========================================\n");
    
    return NextResponse.json(
      {
        error: "Unable to list tools",
        detail: message,
      },
      { status: 500 }
    );
  }
}
