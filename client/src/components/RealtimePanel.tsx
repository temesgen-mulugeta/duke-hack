"use client";

import { useEffect, useRef, useState } from "react";
import EventLog from "./EventLog";
import ToolPanel from "./ToolPanel";
import ConversationTranscript from "./ConversationTranscript";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

interface RealtimePanelProps {
  canvasUpdates?: CanvasUpdate[];
}

export default function RealtimePanel({
  canvasUpdates = [],
}: RealtimePanelProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [toolsRegistered, setToolsRegistered] = useState(false);
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // Function to manually enable audio (for autoplay policy)
  const enableAudio = async () => {
    if (audioElement.current && audioElement.current.srcObject) {
      try {
        await audioElement.current.play();
        setAudioBlocked(false);
        console.log("✅ Audio manually enabled");
      } catch (error) {
        console.error("❌ Failed to enable audio:", error);
      }
    }
  };

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

      // Create a peer connection with explicit configuration
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      console.log("✅ Peer connection created");

      // Monitor peer connection state
      pc.oniceconnectionstatechange = () => {
        console.log("🔌 ICE connection state:", pc.iceConnectionState);
      };
      pc.onconnectionstatechange = () => {
        console.log("🔌 Connection state:", pc.connectionState);
      };
      pc.onsignalingstatechange = () => {
        console.log("🔌 Signaling state:", pc.signalingState);
      };

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      audioElement.current.setAttribute("playsinline", "true"); // Important for mobile

      // Add immediately to document to ensure autoplay works
      audioElement.current.style.display = "none";
      document.body.appendChild(audioElement.current);
      console.log("✅ Audio element added to document");

      pc.ontrack = async (e) => {
        console.log("🔊 Received audio track from OpenAI");
        console.log("Track details:", e.track.kind, e.track.readyState);
        console.log("Streams:", e.streams.length);

        if (audioElement.current && e.streams[0]) {
          audioElement.current.srcObject = e.streams[0];

          // Force play (browser might block autoplay)
          try {
            await audioElement.current.play();
            console.log("✅ Audio playback started");
            setAudioBlocked(false);
          } catch (error) {
            console.error("❌ Audio playback blocked by browser:", error);
            console.log("💡 User interaction required to enable audio");
            setAudioBlocked(true);
          }
        }
      };

      // Add local audio track for microphone input in the browser
      console.log("🎤 Requesting microphone access...");
      console.log(
        "Browser:",
        navigator.userAgent.includes("Chrome")
          ? "Chrome"
          : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Other"
      );

      try {
        // Chrome-compatible audio constraints
        const audioConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            // Chrome-specific: explicit sample rate
            sampleRate: 24000,
            channelCount: 1,
          },
        };

        console.log("🎤 Audio constraints:", audioConstraints);
        const ms = await navigator.mediaDevices.getUserMedia(audioConstraints);

        console.log("✅ Microphone access granted!");
        console.log("Stream details:", {
          id: ms.id,
          active: ms.active,
          tracks: ms.getTracks().length,
        });

        localStream.current = ms;
        setMicrophoneActive(true);

        const audioTrack = ms.getAudioTracks()[0];
        console.log("🎤 Audio track:", {
          id: audioTrack.id,
          kind: audioTrack.kind,
          label: audioTrack.label,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState,
        });
        console.log("🎤 Audio track settings:", audioTrack.getSettings());
        console.log(
          "🎤 Audio track capabilities:",
          audioTrack.getCapabilities()
        );

        // Add track to peer connection
        const sender = pc.addTrack(audioTrack, ms);
        console.log("✅ Audio track added to peer connection");
        console.log("Track sender:", sender.track?.readyState);

        // Monitor track state
        audioTrack.onmute = () => console.warn("⚠️ Audio track muted");
        audioTrack.onunmute = () => console.log("✅ Audio track unmuted");
        audioTrack.onended = () => console.warn("⚠️ Audio track ended");
      } catch (error) {
        console.error("❌ Failed to get microphone access:", error);
        console.error(
          "Error name:",
          error instanceof Error ? error.name : "Unknown"
        );
        console.error(
          "Error message:",
          error instanceof Error ? error.message : String(error)
        );

        // Chrome-specific error guidance
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            console.error(
              "💡 Chrome blocked microphone: Check site permissions in address bar"
            );
          } else if (error.name === "NotFoundError") {
            console.error(
              "💡 No microphone found: Check system audio settings"
            );
          } else if (error.name === "NotReadableError") {
            console.error("💡 Microphone in use by another app");
          }
        }

        throw new Error(
          `Microphone access denied: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

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
            voice: "alloy", // Set voice for audio responses
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1", // Enable transcription to see what's being heard
            },
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
      const model = "gpt-realtime";
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
    console.log("🛑 Stopping session and cleaning up...");

    if (dataChannel) {
      dataChannel.close();
    }

    // Stop local microphone stream
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🎤 Stopped microphone track");
      });
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }

    // Clean up audio element
    if (audioElement.current && document.body.contains(audioElement.current)) {
      document.body.removeChild(audioElement.current);
      console.log("🔊 Removed audio element");
    }
    audioElement.current = null;

    setIsSessionActive(false);
    setDataChannel(null);
    setToolsRegistered(false);
    setRegisteredTools([]);
    setMicrophoneActive(false);
    setIsListening(false);
    setAudioBlocked(false);
    peerConnection.current = null;

    console.log("✅ Session stopped and cleaned up");
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

  // Send canvas update to the model
  function sendCanvasUpdateToLLM(update: CanvasUpdate) {
    const message = `[Canvas Update] ${update.description}. Current canvas has ${update.elementCount} elements.`;
    console.log("🎨 Sending canvas update to LLM:", message);
    sendTextMessage(message);
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
          console.log(
            "✅ Parsed arguments successfully:",
            JSON.stringify(args, null, 2)
          );
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
      console.log(
        `📊 Response status: ${toolResponse.status} ${toolResponse.statusText}`
      );

      if (!toolResponse.ok) {
        const errorText = await toolResponse.text();
        console.error("❌ Tool execution failed with error:");
        console.error(errorText);
        throw new Error(
          `Tool execution failed (${toolResponse.status}): ${errorText}`
        );
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

  // Forward canvas updates to LLM when they arrive
  useEffect(() => {
    if (isSessionActive && canvasUpdates.length > 0) {
      const latestUpdate = canvasUpdates[0];
      // Only send if it's a new update (check timestamp)
      const lastSentTimestamp = localStorage.getItem(
        "lastCanvasUpdateTimestamp"
      );

      if (latestUpdate.timestamp !== lastSentTimestamp) {
        console.log("🎨 New canvas update detected:", latestUpdate);
        sendCanvasUpdateToLLM(latestUpdate);
        localStorage.setItem(
          "lastCanvasUpdateTimestamp",
          latestUpdate.timestamp
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasUpdates, isSessionActive]);

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
          console.log(
            "✅ Session updated! Tools registered:",
            event.session?.tools?.length
          );
        }
        if (event.type === "response.created") {
          console.log("🎤 Model is generating a response");
        }

        // Track voice activity and audio processing
        if (event.type === "input_audio_buffer.committed") {
          console.log("🎤 Audio buffer committed - processing speech");
        }
        if (event.type === "input_audio_buffer.speech_started") {
          console.log("🎙️ Speech detected - listening...");
          setIsListening(true);
        }
        if (event.type === "input_audio_buffer.speech_stopped") {
          console.log("🎙️ Speech ended");
          setIsListening(false);
        }
        if (
          event.type === "conversation.item.input_audio_transcription.completed"
        ) {
          console.log("📝 Transcription completed:", event.item);
          if (event.transcript) {
            console.log("📝 You said:", event.transcript);
          }
        }
        if (event.type === "response.audio.delta") {
          // Don't log every delta, just note that audio is being received
          if (!event.logged) {
            console.log("🔊 Receiving audio response from AI...");
            event.logged = true;
          }
        }
        if (event.type === "response.audio.done") {
          console.log("🔊 AI audio response complete");
        }
        if (
          event.type === "response.audio_transcript.delta" ||
          event.type === "response.audio_transcript.done"
        ) {
          console.log("💬 AI transcript:", event);
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
            console.log(
              "🔧 Function call detected (arguments.done):",
              event.item
            );
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
            console.log(
              "🔧 Function call detected (output_item.done):",
              event.item
            );
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
          <div className="flex items-center gap-3">
            {/* Connection Status */}
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

            {/* Microphone Status */}
            {microphoneActive && (
              <div className="flex items-center gap-1">
                <span className="text-xs">🎤</span>
                <span className="text-xs text-gray-600">Mic Active</span>
              </div>
            )}
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

        {/* Audio Blocked Warning */}
        {audioBlocked && (
          <div className="mt-2">
            <div className="px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
              🔇 Audio blocked by browser
            </div>
            <button
              onClick={enableAudio}
              className="w-full mt-1 py-1 px-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded transition-colors"
            >
              Click to Enable Audio
            </button>
          </div>
        )}

        {/* Listening Indicator */}
        {isListening && (
          <div className="mt-2 px-2 py-1 bg-purple-100 border border-purple-300 rounded text-xs text-purple-800 animate-pulse">
            🎙️ Listening to your voice...
          </div>
        )}

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

        {/* Canvas Updates Indicator */}
        {canvasUpdates.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span>🎨</span>
              <span>Canvas updates: {canvasUpdates.length}</span>
            </div>
            {canvasUpdates[0] && (
              <div className="mt-1 text-xs text-gray-500 truncate">
                Latest: {canvasUpdates[0].description}
              </div>
            )}
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

      {/* Transcript & Event Log Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
          <div className="shrink-0 px-4 pt-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript">Conversation</TabsTrigger>
              <TabsTrigger value="events">Event Log</TabsTrigger>
              <TabsTrigger value="tools">Tool Calls</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="transcript"
            className="flex-1 overflow-hidden mt-0"
          >
            <ConversationTranscript
              events={events}
              canvasUpdates={canvasUpdates}
            />
          </TabsContent>

          <TabsContent
            value="events"
            className="flex-1 overflow-y-auto px-4 py-3 mt-0"
          >
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-700">Event Log</h3>
              <p className="text-xs text-gray-500">
                {events.length} event{events.length !== 1 ? "s" : ""}
              </p>
            </div>
            <EventLog events={events} />
          </TabsContent>

          <TabsContent
            value="tools"
            className="flex-1 overflow-y-auto px-4 py-3 mt-0"
          >
            <ToolPanel
              sendClientEvent={sendClientEvent}
              events={events}
              isSessionActive={isSessionActive}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
