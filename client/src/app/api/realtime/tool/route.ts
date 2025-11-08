import { NextRequest, NextResponse } from "next/server";

import { callExcalidrawTool } from "@/lib/mcp/excalidrawClient";

type ToolCallPayload = {
  name?: string;
  toolCallId?: string;
  arguments?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  console.log("\n========================================");
  console.log("🔧 MCP TOOL EXECUTION REQUEST");
  console.log("========================================");
  
  try {
    const payload = (await request.json()) as ToolCallPayload;
    const { name, arguments: args, toolCallId } = payload ?? {};

    console.log("📋 Request payload:", JSON.stringify(payload, null, 2));
    console.log("- Tool name:", name);
    console.log("- Tool call ID:", toolCallId);
    console.log("- Arguments:", JSON.stringify(args, null, 2));

    if (!name) {
      console.error("❌ Missing tool name in request");
      return NextResponse.json(
        { error: "Tool name is required" },
        { status: 400 },
      );
    }

    console.log(`🚀 Calling MCP tool: "${name}"`);
    const startTime = Date.now();
    
    const result = await callExcalidrawTool(name, args);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ MCP tool execution took ${duration}ms`);
    console.log("✅ MCP tool result:", JSON.stringify(result, null, 2));
    console.log("========================================\n");

    return NextResponse.json({
      toolCallId,
      result,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ MCP TOOL EXECUTION FAILED");
    console.error("========================================");
    console.error("Error details:", error);
    
    const message =
      error instanceof Error ? error.message : "Unexpected tool call error";
    
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("========================================\n");
    
    return NextResponse.json(
      {
        error: "Failed to execute MCP tool",
        detail: message,
      },
      { status: 500 },
    );
  }
}

