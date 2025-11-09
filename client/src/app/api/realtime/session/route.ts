import { NextResponse } from "next/server";
import circlePrompt from "@/prompts/circle.json";
import rectanglePrompt from "@/prompts/rectangle.json";
import trianglePrompt from "@/prompts/triangle.json";

import { listExcalidrawTools } from "@/lib/mcp/excalidrawClient";

// Map of available topics to their prompts
const TOPIC_PROMPTS = {
  circle: circlePrompt,
  rectangle: rectanglePrompt,
  triangle: trianglePrompt,
} as const;

type MathTopic = keyof typeof TOPIC_PROMPTS;

// Convert system prompt JSON to readable instructions for Realtime API
function formatSystemPrompt(promptData: typeof circlePrompt): string {
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

  instructions += `\nInterruptions:\n`;
  if (content.behavior.interruptions.on_user_says_stop) {
    instructions += `When user says STOP:\n`;
    content.behavior.interruptions.on_user_says_stop.forEach((action) => {
      instructions += `- ${action}\n`;
    });
  }
  if (content.behavior.interruptions.on_user_question) {
    instructions += `When user asks a question:\n`;
    content.behavior.interruptions.on_user_question.forEach((action) => {
      instructions += `- ${action}\n`;
    });
  }
  if (content.behavior.interruptions.on_random_sounds) {
    instructions += `When random sounds occur:\n`;
    content.behavior.interruptions.on_random_sounds.forEach((action) => {
      instructions += `- ${action}\n`;
    });
  }

  instructions += `\nCanvas User Input:\n`;
  if (content.behavior.canvas_user_input.disabled) {
    instructions += `- DISABLED: ${content.behavior.canvas_user_input.reason}\n`;
    instructions += `- Note: ${content.behavior.canvas_user_input.note}\n`;
  }
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

export async function POST(request: Request) {
  console.log("\n========================================");
  console.log("🔧 REALTIME SESSION SETUP");
  console.log("========================================");

  try {
    // Parse request body to get selected topic
    const body = await request.json();
    const topic = (body.topic || "circle") as MathTopic;

    // Validate topic
    if (!TOPIC_PROMPTS[topic]) {
      return NextResponse.json(
        {
          error: "Invalid topic",
          detail: `Topic must be one of: ${Object.keys(TOPIC_PROMPTS).join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    console.log(`📚 Selected topic: ${topic}`);

    console.log("📡 Fetching tools from MCP Excalidraw client...");
    const startTime = Date.now();

    // Just return the tools list - the WebRTC connection will be handled client-side
    let tools;
    try {
      tools = await listExcalidrawTools();
    } catch (mcpError) {
      console.error("❌ Failed to list tools from MCP server:");
      console.error(mcpError);

      // Return error response
      return NextResponse.json(
        {
          error: "MCP Server Connection Failed",
          detail: `Could not connect to MCP server: ${
            mcpError instanceof Error ? mcpError.message : String(mcpError)
          }. Make sure the Express canvas server is running on port 3000.`,
        },
        { status: 503 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ Tool fetch took ${duration}ms`);
    console.log(`✅ Retrieved ${tools.length} tools from MCP server`);

    if (tools.length === 0) {
      console.warn("⚠️ WARNING: No tools retrieved from MCP server!");
      return NextResponse.json(
        {
          error: "No Tools Available",
          detail:
            "MCP server returned 0 tools. The AI won't be able to draw on canvas.",
        },
        { status: 500 }
      );
    }

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

    // Load topic-specific prompt and convert to instructions string
    const promptData = TOPIC_PROMPTS[topic];
    const instructions = formatSystemPrompt(promptData);
    console.log("\n📝 System Instructions for", topic, ":");
    console.log(instructions);
    console.log("========================================\n");

    return NextResponse.json({
      tools: realtimeTools,
      instructions,
      topic,
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
