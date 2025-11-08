import path from "node:path";
import process from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  StdioServerParameters,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

let clientPromise: Promise<Client> | null = null;
let activeTransport: StdioClientTransport | null = null;

const DEFAULT_CLIENT_INFO = {
  name: "mcp-excalidraw-next-client",
  version: "0.1.0",
};

const defaultScriptPath = path.resolve(process.cwd(), "..", "dist", "index.js");

function resolveServerParameters(): StdioServerParameters {
  const env = {
    ...getDefaultEnvironment(),
    ...process.env,
  };

  if (!env.EXPRESS_SERVER_URL) {
    env.EXPRESS_SERVER_URL =
      process.env.MCP_CANVAS_URL ??
      process.env.CANVAS_URL ??
      process.env.NEXT_PUBLIC_MCP_SERVER_URL ??
      "http://localhost:3000";
  }

  const command = process.env.MCP_SERVER_COMMAND ?? "node";
  const args = process.env.MCP_SERVER_ARGS?.split(" ").filter(Boolean) ?? [
    process.env.MCP_SERVER_SCRIPT ?? defaultScriptPath,
  ];

  return {
    command,
    args,
    env: {
      EXPRESS_SERVER_URL: "http://localhost:3000",
      ENABLE_CANVAS_SYNC: "true",
    },
    stderr: "inherit",
  };
}

async function createClient(): Promise<Client> {
  console.log("\n========================================");
  console.log("🔌 CREATING MCP CLIENT");
  console.log("========================================");

  const serverParams = resolveServerParameters();
  console.log("📋 Server parameters:");
  console.log("- Command:", serverParams.command);
  console.log("- Args:", serverParams.args);
  console.log("- Environment:", JSON.stringify(serverParams.env, null, 2));

  const transport = new StdioClientTransport(serverParams);
  console.log("✅ Transport created");

  const client = new Client(DEFAULT_CLIENT_INFO);
  console.log("✅ Client created:", DEFAULT_CLIENT_INFO.name);

  try {
    console.log("🔄 Attempting to connect to MCP server...");
    await client.connect(transport);
    console.log("✅ Successfully connected to MCP server!");
    console.log("========================================\n");
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ FAILED TO CONNECT TO MCP SERVER");
    console.error("========================================");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    console.error("========================================\n");

    await transport.close().catch(() => undefined);
    throw error;
  }

  activeTransport = transport;

  transport.onclose = () => {
    console.log("⚠️ MCP transport closed");
    clientPromise = null;
    activeTransport = null;
  };
  transport.onerror = (error) => {
    console.error("❌ MCP transport error:", error);
    clientPromise = null;
    activeTransport = null;
  };

  return client;
}

export async function getExcalidrawClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = createClient();
  }
  return clientPromise;
}

export async function listExcalidrawTools() {
  console.log("📋 Listing Excalidraw tools...");
  const client = await getExcalidrawClient();
  const { tools } = await client.listTools();
  console.log(
    `✅ Found ${tools.length} tools:`,
    tools.map((t) => t.name).join(", ")
  );
  return tools;
}

export async function testExcalidrawTool(
  args?: CallToolRequest["params"]["arguments"]
) {
  // Provide a default test Mermaid diagram if no arguments are given
  const defaultArgs = {
    mermaidDiagram: "graph LR; A((Test Node)) --> B((Another Node));",
    config: {
      theme: "neutral",
    },
  };
  const client = await getExcalidrawClient();
  return client.callTool({
    name: "create_from_mermaid",
    arguments: args && Object.keys(args).length > 0 ? args : defaultArgs,
  });
}

export async function callExcalidrawTool(
  name: string,
  args: CallToolRequest["params"]["arguments"]
) {
  console.log(`🔧 Calling Excalidraw tool: "${name}"`);
  console.log("Arguments:", JSON.stringify(args, null, 2));

  const client = await getExcalidrawClient();
  const startTime = Date.now();

  const result = await client.callTool({
    name,
    arguments: args ?? {},
  });

  const duration = Date.now() - startTime;
  console.log(`⏱️ Tool call took ${duration}ms`);
  console.log("✅ Tool result:", JSON.stringify(result, null, 2));

  return result;
}

export async function shutdownExcalidrawClient() {
  if (activeTransport) {
    await activeTransport.close();
    activeTransport = null;
  }
  clientPromise = null;
}

process.on("exit", () => {
  void shutdownExcalidrawClient();
});
