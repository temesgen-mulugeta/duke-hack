import { NextResponse } from "next/server";

import { callExcalidrawTool } from "@/lib/mcp/excalidrawClient";

const EXPRESSION = "2x+5";

export async function POST() {
  try {
    const result = await callExcalidrawTool("create_from_mermaid", {
      mermaidDiagram: `graph LR; A(( ${EXPRESSION} ));`,
      config: {
        theme: "neutral",
      },
    });

    return NextResponse.json({
      success: true,
      expression: EXPRESSION,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to call MCP tool.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
