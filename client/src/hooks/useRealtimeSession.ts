"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRealtimeStore } from "@/store/realtimeStore";

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

interface UseRealtimeSessionProps {
  topic: string;
  canvasUpdates?: CanvasUpdate[]; // Currently unused - canvas updates disabled
  externalSessionActive?: boolean;
  onSessionStateChange?: (active: boolean) => void;
}

export function useRealtimeSession({
  topic,
  canvasUpdates = [], // eslint-disable-line @typescript-eslint/no-unused-vars
  externalSessionActive,
  onSessionStateChange,
}: UseRealtimeSessionProps) {
  // Use Zustand store for global state
  const {
    isSessionActive,
    setSessionActive,
    addEvent,
    setEvents,
    setToolsRegistered,
    setExecutingTool,
    setMicrophoneActive,
    setIsListening,
    setAudioBlocked,
    setCurrentTopic,
    setSendTextMessage,
  } = useRealtimeStore();

  // Local refs for WebRTC
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // Update topic in store
  useEffect(() => {
    setCurrentTopic(topic);
  }, [topic, setCurrentTopic]);

  // Wrapper to update both store and external state
  const updateSessionState = (active: boolean) => {
    setSessionActive(active);
    onSessionStateChange?.(active);
  };

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
      // Get available tools from our backend with selected topic
      const toolsResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
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
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("🧊 New ICE candidate gathered:", event.candidate.type);
        } else {
          console.log("🧊 ICE gathering complete (final candidate null)");
        }
      };

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      audioElement.current.setAttribute("playsinline", "true");

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

      // Add local audio track for microphone input
      console.log("🎤 Requesting microphone access...");

      try {
        const audioConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000,
            channelCount: 1,
          },
        };

        console.log("🎤 Audio constraints:", audioConstraints);
        const ms = await navigator.mediaDevices.getUserMedia(audioConstraints);

        console.log("✅ Microphone access granted!");
        localStream.current = ms;
        setMicrophoneActive(true);

        const audioTrack = ms.getAudioTracks()[0];
        console.log("🎤 Audio track settings:", audioTrack.getSettings());

        // Add track to peer connection
        pc.addTrack(audioTrack, ms);
        console.log("✅ Audio track added to peer connection");
      } catch (error) {
        console.error("❌ Failed to get microphone access:", error);
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
        updateSessionState(true);
        setEvents([]);

        // Format session update exactly as OpenAI expects
        const sessionUpdate = {
          type: "session.update",
          session: {
            tools: availableTools,
            instructions: instructions,
            tool_choice: "auto",
            modalities: ["text", "audio"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
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

        // Send session update
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

        // Update UI state in Zustand store
        setToolsRegistered(
          true,
          availableTools.map((t: { name: string }) => t.name)
        );
        addEvent(logEvent);

        // FORCE START: Send an immediate trigger message to make AI start teaching
        console.log("🚀 Forcing AI to start teaching immediately...");
        setTimeout(() => {
          const triggerEvent = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Start teaching now. Begin your explanation immediately.",
                },
              ],
            },
          };

          dc.send(JSON.stringify(triggerEvent));
          console.log("✅ Sent start trigger message");

          // Trigger a response
          dc.send(JSON.stringify({ type: "response.create" }));
          console.log("✅ Triggered AI response");
        }, 500); // Small delay to ensure session is fully established
      });

      // Set the data channel ref AFTER setting up the listener
      dataChannelRef.current = dc;

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to finish so we include all candidates in the SDP
      await new Promise<void>((resolve) => {
        let resolved = false;
        const finish = (reason: string) => {
          if (!resolved) {
            resolved = true;
            console.log(`🧊 ICE gathering finished via ${reason}`);
            resolve();
          }
        };

        let timeout: number | undefined;

        const checkState = () => {
          if (pc.iceGatheringState === "complete") {
            if (timeout !== undefined) {
              window.clearTimeout(timeout);
              timeout = undefined;
            }
            pc.removeEventListener("icegatheringstatechange", checkState);
            finish("event");
          }
        };

        timeout = window.setTimeout(() => {
          console.warn(
            "⏱️ ICE gathering timeout hit - proceeding with current candidates"
          );
          pc.removeEventListener("icegatheringstatechange", checkState);
          timeout = undefined;
          finish("timeout");
        }, 2_000);

        if (pc.iceGatheringState === "complete") {
          if (timeout !== undefined) {
            window.clearTimeout(timeout);
            timeout = undefined;
          }
          finish("immediate");
        } else {
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });

      const localDescription = pc.localDescription;
      if (!localDescription?.sdp) {
        throw new Error("Missing local SDP after ICE gathering completed");
      }

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-realtime-mini";

      console.log("📡 Sending SDP offer to OpenAI...");
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: localDescription.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      console.log(
        "📊 SDP Response status:",
        sdpResponse.status,
        sdpResponse.statusText
      );

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("❌ Failed to get SDP response:", errorText);
        throw new Error(
          `OpenAI API error (${sdpResponse.status}): ${errorText}`
        );
      }

      const sdp = await sdpResponse.text();
      console.log("✅ Received SDP answer from OpenAI");
      console.log("SDP length:", sdp.length, "characters");

      const answer = { type: "answer" as RTCSdpType, sdp };
      await pc.setRemoteDescription(answer);
      console.log("✅ Remote description set successfully");

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

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
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

    updateSessionState(false);
    dataChannelRef.current = null;
    setToolsRegistered(false, []);
    setMicrophoneActive(false);
    setIsListening(false);
    setAudioBlocked(false);
    peerConnection.current = null;

    console.log("✅ Session stopped and cleaned up");
  }

  // Send a message to the model
  const sendClientEvent = useCallback(
    (message: unknown) => {
      const realtimeMessage = message as RealtimeEvent;
      const dataChannel = dataChannelRef.current;
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
        addEvent(realtimeMessage);
      } else {
        console.error(
          "Failed to send message - no data channel available",
          realtimeMessage
        );
      }
    },
    [addEvent]
  );

  // Send a text message to the model
  const sendTextMessage = useCallback(
    (message: string) => {
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
    },
    [sendClientEvent]
  );

  useEffect(() => {
    setSendTextMessage(() => sendTextMessage);
    return () => setSendTextMessage(undefined);
  }, [setSendTextMessage, sendTextMessage]);

  // Send canvas update to the model (DISABLED - not used currently)
  // function sendCanvasUpdateToLLM(update: CanvasUpdate) {
  //   const message = `[Canvas Update] ${update.description}. Current canvas has ${update.elementCount} elements.`;
  //   console.log("🎨 Sending canvas update to LLM:", message);
  //   sendTextMessage(message);
  // }

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

  // Canvas update forwarding DISABLED - students don't draw, only AI draws
  // useEffect(() => {
  //   if (isSessionActive && canvasUpdates.length > 0) {
  //     const latestUpdate = canvasUpdates[0];
  //     // Only send if it's a new update (check timestamp)
  //     const lastSentTimestamp = localStorage.getItem(
  //       "lastCanvasUpdateTimestamp"
  //     );

  //     if (latestUpdate.timestamp !== lastSentTimestamp) {
  //       console.log("🎨 New canvas update detected:", latestUpdate);
  //       sendCanvasUpdateToLLM(latestUpdate);
  //       localStorage.setItem(
  //         "lastCanvasUpdateTimestamp",
  //         latestUpdate.timestamp
  //       );
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [canvasUpdates, isSessionActive]);

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    const dataChannel = dataChannelRef.current;
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

        addEvent(event);

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
        }
        if (event.type === "response.audio.delta") {
          // Don't log every delta
        }
        if (event.type === "response.audio.done") {
          console.log("🔊 AI audio response complete");
        }

        // Handle function calls
        if (
          event.type === "response.function_call_arguments.done" &&
          event.item?.call_id
        ) {
          const callId = event.item.call_id;

          if (!processedCalls.has(callId)) {
            processedCalls.add(callId);
            console.log(
              "🔧 Function call detected (arguments.done):",
              event.item
            );
            void handleFunctionCall(event.item);
          }
        } else if (
          event.type === "response.output_item.done" &&
          event.item?.type === "function_call" &&
          event.item?.call_id
        ) {
          const callId = event.item.call_id;

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
  }, [dataChannelRef.current]);

  // Handle external session control
  useEffect(() => {
    if (
      externalSessionActive !== undefined &&
      externalSessionActive !== isSessionActive
    ) {
      if (externalSessionActive && !isSessionActive) {
        console.log("🎯 External trigger: Starting session");
        startSession();
      } else if (!externalSessionActive && isSessionActive) {
        console.log("🎯 External trigger: Stopping session");
        stopSession();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSessionActive]);

  // Export control functions (state is in Zustand store)
  return {
    startSession,
    stopSession,
    sendClientEvent,
    sendTextMessage,
    enableAudio,
  };
}
