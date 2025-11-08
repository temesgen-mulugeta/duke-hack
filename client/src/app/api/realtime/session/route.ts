import { NextResponse } from "next/server";
import systemPromptData from "@/system-prompt.json";

import { listExcalidrawTools } from "@/lib/mcp/excalidrawClient";

// Convert system prompt JSON to readable instructions for Realtime API
function formatSystemPrompt(promptData: typeof systemPromptData): string {
  const content = promptData.content;

  let instructions = `${content.summary}\n\n`;

  instructions += `## DESCRIPTION\n${content.description}\n\n`;

  instructions += `## TEACHING STYLE\n`;
  instructions += `Tone: ${content.teaching_style.tone}\n`;
  instructions += `Approach:\n`;
  content.teaching_style.approach.forEach((item) => {
    instructions += `- ${item}\n`;
  });
  instructions += `\n`;

  instructions += `## TOPIC FOCUS\n`;
  content.topic_focus.forEach((topic) => {
    instructions += `- ${topic}\n`;
  });
  instructions += `\n`;

  instructions += `## BEHAVIOR\n`;
  instructions += `When session starts:\n`;
  content.behavior.realtime_start.forEach((action) => {
    instructions += `- ${action}\n`;
  });
  instructions += `\nWhen user interrupts with a question:\n`;
  content.behavior.interruptions.on_user_question.forEach((action) => {
    instructions += `- ${action}\n`;
  });
  instructions += `\nWhen user draws on canvas:\n`;
  content.behavior.canvas_user_input.on_unknown_user_drawing.forEach(
    (action) => {
      instructions += `- ${action}\n`;
    }
  );
  instructions += `\n`;

  instructions += `## AVAILABLE TOOLS\n`;
  content.allowed_tools.forEach((tool) => {
    instructions += `- ${tool}\n`;
  });
  instructions += `\n`;

  instructions += `## IMPORTANT RULES\n`;
  content.rules.forEach((rule) => {
    instructions += `- ${rule}\n`;
  });
  instructions += `\n`;

  instructions += `## WORKFLOW\n`;
  instructions += `Initial lesson flow:\n`;
  content.workflow_example.initial.forEach((step) => {
    instructions += `${step}\n`;
  });
  instructions += `\nExample problems:\n`;
  content.workflow_example.examples.forEach((example) => {
    instructions += `- ${example}\n`;
  });
  instructions += `\n`;

  instructions += `## GOOD EXAMPLES\n`;
  content.good_examples.forEach((example) => {
    instructions += `✓ ${example}\n`;
  });
  instructions += `\n`;

  instructions += `## BAD EXAMPLES (AVOID)\n`;
  content.bad_examples.forEach((example) => {
    instructions += `✗ ${example}\n`;
  });

  return instructions;
}

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

    // Convert system prompt JSON to instructions string
    const instructions = formatSystemPrompt(systemPromptData);
    console.log("\n📝 System Instructions:");
    console.log(instructions);
    console.log("========================================\n");

    return NextResponse.json({
      tools: realtimeTools,
      instructions,
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
