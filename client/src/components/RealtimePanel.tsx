"use client";

import { useEffect, useRef, useState } from "react";
import EventLog from "./EventLog";
import ToolPanel from "./ToolPanel";

type RealtimeEvent = {
  event_id?: string;
  type: string;
  timestamp?: string;
  session?: {
    tools?: Array<{
      type: string;
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  };
  item?: {
    type?: string;
    role?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
    output?: string;
  };
  [key: string]: unknown;
};

export default function RealtimePanel() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [toolsRegistered, setToolsRegistered] = useState(false);
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [executingTool, setExecutingTool] = useState<string | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  async function startSession() {
    try {
      // Get available tools from our backend
      const toolsResponse = await fetch("/api/realtime/session", {
        method: "POST",
      });
      const toolsData = await toolsResponse.json();
      const availableTools = toolsData.tools || [];
      const instructions = toolsData.instructions || "";

      // Get OpenAI API token
      const tokenResponse = await fetch("/api/realtime/token");
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.value;

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => {
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");

      // Send session update with tools and instructions once connected
      dc.addEventListener("open", () => {
        console.log("✅ Data channel opened! Registering tools...");
        setIsSessionActive(true);
        setEvents([]);

        // Format session update exactly as OpenAI expects
        const sessionUpdate = {
          type: "session.update",
          session: {
            tools: availableTools,
            instructions: instructions,
            tool_choice: "auto", // Let model decide when to use tools
            modalities: ["text", "audio"],
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        };

        console.log("📋 SESSION UPDATE PAYLOAD:");
        console.log("- Tool count:", availableTools.length);
        console.log(
          "- Tool names:",
          availableTools.map((t: { name: string }) => t.name)
        );
        console.log("- Tool choice:", "auto");
        console.log("- Instructions length:", instructions.length);
        console.log(
          "- Full session config:",
          JSON.stringify(sessionUpdate, null, 2)
        );

        // Send session update WITHOUT event_id or timestamp (OpenAI doesn't expect these on session.update)
        console.log("🚀 Sending session.update to OpenAI...");
        dc.send(JSON.stringify(sessionUpdate));
        console.log("✅ Session update sent!");

        // Add to events log with metadata for display only
        const timestamp = new Date().toLocaleTimeString();
        const logEvent = {
          ...sessionUpdate,
          event_id: crypto.randomUUID(),
          timestamp,
        };

        // Update UI state
        setToolsRegistered(true);
        setRegisteredTools(availableTools.map((t: { name: string }) => t.name));
        setEvents((prev) => [logEvent, ...prev]);
      });

      // Set the data channel state AFTER setting up the listener
      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const sdp = await sdpResponse.text();
      const answer = { type: "answer" as RTCSdpType, sdp };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
    } catch (error) {
      console.error("Failed to start session:", error);
      alert(
        `Failed to start session: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    setToolsRegistered(false);
    setRegisteredTools([]);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message: unknown) {
    const realtimeMessage = message as RealtimeEvent;
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      realtimeMessage.event_id =
        realtimeMessage.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(realtimeMessage));

      // if guard just in case the timestamp exists by miracle
      if (!realtimeMessage.timestamp) {
        realtimeMessage.timestamp = timestamp;
      }
      setEvents((prev) => [realtimeMessage, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        realtimeMessage
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message: string) {
    const event: RealtimeEvent = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Handle function calls from the model
  async function handleFunctionCall(item: {
    call_id?: string;
    name?: string;
    arguments?: string;
  }) {
    console.log("\n========================================");
    console.log("🔧 HANDLING FUNCTION CALL");
    console.log("========================================");
    console.log("📋 Full item received:", JSON.stringify(item, null, 2));

    if (!item.name || !item.call_id) {
      console.error("❌ Invalid function call - missing required fields:");
      console.error("- name:", item.name);
      console.error("- call_id:", item.call_id);
      return;
    }

    try {
      // Parse arguments
      let args: Record<string, unknown> = {};
      if (item.arguments) {
        try {
          args = JSON.parse(item.arguments);
          console.log("✅ Parsed arguments successfully:", JSON.stringify(args, null, 2));
        } catch (e) {
          console.error("❌ Failed to parse function arguments:", e);
          console.error("Raw arguments string:", item.arguments);
          throw new Error(`Invalid JSON in arguments: ${item.arguments}`);
        }
      } else {
        console.log("ℹ️ No arguments provided (using empty object)");
      }

      console.log(`\n🚀 Executing MCP tool: "${item.name}"`);
      console.log("📤 Sending to /api/realtime/tool with payload:");
      const payload = {
        name: item.name,
        arguments: args,
        toolCallId: item.call_id,
      };
      console.log(JSON.stringify(payload, null, 2));

      // Show visual indicator
      setExecutingTool(item.name);

      // Call the MCP tool via our backend API
      const startTime = Date.now();
      const toolResponse = await fetch("/api/realtime/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const duration = Date.now() - startTime;

      console.log(`⏱️ Tool execution took ${duration}ms`);
      console.log(`📊 Response status: ${toolResponse.status} ${toolResponse.statusText}`);

      if (!toolResponse.ok) {
        const errorText = await toolResponse.text();
        console.error("❌ Tool execution failed with error:");
        console.error(errorText);
        throw new Error(`Tool execution failed (${toolResponse.status}): ${errorText}`);
      }

      const result = await toolResponse.json();
      console.log("✅ Tool execution successful!");
      console.log("📦 Raw result:", JSON.stringify(result, null, 2));

      // Format the output
      let outputText = "";
      if (result?.result?.content && Array.isArray(result.result.content)) {
        outputText = result.result.content
          .map((c: { type?: string; text?: string }) => c.text || "")
          .join("\n");
        console.log("📝 Extracted text from content array");
      } else if (result?.result) {
        outputText = JSON.stringify(result.result);
        console.log("📝 Using result object as string");
      } else {
        outputText = JSON.stringify(result);
        console.log("📝 Using full response as string");
      }

      console.log("📤 Final output to send to model:");
      console.log(outputText);

      // Send the function output back to the model
      const outputEvent = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: item.call_id,
          output: outputText,
        },
      };
      console.log("\n📨 Sending function output event:");
      console.log(JSON.stringify(outputEvent, null, 2));
      sendClientEvent(outputEvent);

      // Trigger a new response
      console.log("🔄 Triggering new response from model...");
      sendClientEvent({ type: "response.create" });
      
      console.log("========================================");
      console.log("✅ FUNCTION CALL COMPLETE");
      console.log("========================================\n");

      // Clear visual indicator after a delay
      setTimeout(() => setExecutingTool(null), 2000);
    } catch (error) {
      console.error("\n========================================");
      console.error("❌ FUNCTION CALL FAILED");
      console.error("========================================");
      console.error("Error details:", error);
      if (error instanceof Error) {
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
      }
      console.error("========================================\n");
      
      setExecutingTool(null);

      // Send error back to the model
      const errorOutput = JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
      
      console.log("📨 Sending error to model:", errorOutput);
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: item.call_id,
          output: errorOutput,
        },
      });
      
      // Still trigger a response so the model can acknowledge the error
      sendClientEvent({ type: "response.create" });
    }
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      const processedCalls = new Set<string>(); // Track processed function calls

      // Append new server events to the list
      const messageHandler = (e: MessageEvent) => {
        const event = JSON.parse(e.data) as RealtimeEvent;
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // Log all events for debugging
        console.log("📨 Received event:", event.type, event);

        setEvents((prev) => [event, ...prev]);

        // Log specific events that might indicate tool usage
        if (event.type === "session.updated") {
          console.log("✅ Session updated! Tools registered:", event.session?.tools?.length);
        }
        if (event.type === "response.created") {
          console.log("🎤 Model is generating a response");
        }

        // Handle function calls - use response.function_call_arguments.done as primary trigger
        // This event fires when the model has finished streaming function arguments
        if (
          event.type === "response.function_call_arguments.done" &&
          event.item?.call_id
        ) {
          const callId = event.item.call_id;
          
          // Avoid processing the same call twice
          if (!processedCalls.has(callId)) {
            processedCalls.add(callId);
            console.log("🔧 Function call detected (arguments.done):", event.item);
            void handleFunctionCall(event.item);
          }
        }
        // Fallback: Also handle response.output_item.done for completed function calls
        else if (
          event.type === "response.output_item.done" &&
          event.item?.type === "function_call" &&
          event.item?.call_id
        ) {
          const callId = event.item.call_id;
          
          // Only process if we haven't already handled it
          if (!processedCalls.has(callId)) {
            processedCalls.add(callId);
            console.log("🔧 Function call detected (output_item.done):", event.item);
            void handleFunctionCall(event.item);
          }
        }
      };

      dataChannel.addEventListener("message", messageHandler);

      return () => {
        dataChannel.removeEventListener("message", messageHandler);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-emerald-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900">
            Realtime Console
          </h1>
        </div>
      </div>

      {/* Connection Status & Controls */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Status</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isSessionActive ? "bg-green-500 animate-pulse" : "bg-gray-300"
              }`}
            />
            <span className="text-xs text-gray-600">
              {isSessionActive ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <button
          onClick={isSessionActive ? stopSession : startSession}
          className={`w-full py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
            isSessionActive
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {isSessionActive ? "Disconnect" : "Start Session"}
        </button>

        {toolsRegistered && (
          <div className="mt-2 text-xs text-emerald-600">
            ✓ {registeredTools.length} tools registered
          </div>
        )}

        {executingTool && (
          <div className="mt-2 px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800 animate-pulse">
            ⚙️ Executing: {executingTool}
          </div>
        )}
      </div>

      {/* Message Input */}
      {isSessionActive && (
        <div className="shrink-0 px-4 py-3 border-b border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input");
              if (input && input.value.trim()) {
                sendTextMessage(input.value);
                input.value = "";
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Tool Panel */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 max-h-[200px] overflow-y-auto">
        <ToolPanel
          sendClientEvent={sendClientEvent}
          events={events}
          isSessionActive={isSessionActive}
        />
      </div>

      {/* Event Log */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-gray-700">Event Log</h3>
          <p className="text-xs text-gray-500">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <EventLog events={events} />
      </div>
    </div>
  );
}
