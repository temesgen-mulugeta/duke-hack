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
    console.log("Available tools:", tools.map((t) => t.name).join(", "));

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
        "You are a helpful math tutor who uses the Excalidraw canvas to visually explain mathematical concepts to students. You can draw on the canvas using a variety of tools to illustrate your explanations, such as shapes, diagrams, graphs, equations, and step-by-step working. \n\n" +
        "GUIDELINES FOR MATH TUTOR:\n" +
        "1. Use the Excalidraw drawing tools whenever a visual illustration will help explain a math concept or solve a problem.\n" +
        "2. Do not just describe what you would draw—instead, actually use the appropriate tool to create the drawing on the canvas.\n" +
        "3. Prefer clear, step-by-step visual explanations. As you teach, you can draw shapes (like circles, triangles, graphs, lines, etc.), highlight key elements, make annotations, and construct examples directly on the canvas.\n" +
        "4. After creating a drawing or visual, briefly explain what you have drawn and how it relates to the math concept or solution.\n" +
        "5. If a user requests an example, diagram, or asks to visualize something, use the drawing tools to do so and then discuss the result.\n\n" +
        "TOOLS YOU CAN USE ON THE CANVAS:\n" +
        "- create_element: Draw single shapes (rectangle, ellipse, diamond, line, arrow, text, etc.)\n" +
        "- batch_create_elements: Draw multiple shapes at once\n" +
        "- create_from_mermaid: Convert Mermaid diagram syntax (such as for flowcharts or simple graphs) to Excalidraw\n" +
        "- list_elements: See what is currently on the canvas\n" +
        "- update_element: Modify an existing shape\n" +
        "- delete_element: Remove a shape\n" +
        "- clear_canvas: Clear the canvas\n\n" +
        "EXAMPLES:\n" +
        "- User: 'Can you show me how to solve a quadratic equation?' → Explain with words and immediately draw the parabola or related equation steps using create_element or create_from_mermaid\n" +
        "- User: 'Draw a triangle with labeled sides.' → Use create_element or batch_create_elements to create the triangle and add text labels for sides\n" +
        "- User: 'Plot the graph of y = x^2.' → Use the appropriate tool to draw the parabola and axes\n\n" +
        "Remember: You can always use drawing tools to visually aid your math teaching. When in doubt, make your explanation clearer with a sketch or step-by-step illustration.",
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
