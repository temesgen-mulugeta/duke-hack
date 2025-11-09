"use client";

import { useEffect, useState, useRef } from "react";
import TopicMenu, { MathTopic } from "@/components/TopicMenu";
import StartLearningButton from "@/components/StartLearningButton";
import RealtimeDebugDialog from "@/components/RealtimeDebugDialog";
import SessionController from "@/components/SessionController";

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

export default function Home() {
  const canvasUrl =
    process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://localhost:3000";

  const [canvasUpdates, setCanvasUpdates] = useState<CanvasUpdate[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<MathTopic | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Listen for postMessage events from canvas iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In production, verify event.origin matches canvasUrl
      if (event.data && event.data.type === "canvas_update") {
        console.log("📨 Received canvas update via postMessage:", event.data);
        setCanvasUpdates((prev) => [event.data, ...prev]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Connect to Express server WebSocket for canvas updates
  useEffect(() => {
    const wsUrl = canvasUrl.replace(/^http/, "ws");
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ Connected to Express WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Listen for canvas user updates
        if (data.type === "canvas_user_update") {
          console.log("📨 Received canvas update via WebSocket:", data);
          setCanvasUpdates((prev) => [data, ...prev]);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [canvasUrl]);

  // Clear canvas when topic changes
  const clearCanvas = async () => {
    try {
      console.log("🧹 Clearing canvas...");

      // Use the bulk DELETE endpoint to clear all elements at once
      const response = await fetch(`${canvasUrl}/api/elements`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        console.log(`✅ Canvas cleared - removed ${result.count} element(s)`);
      } else {
        console.error("❌ Failed to clear canvas:", result.error);
      }
    } catch (error) {
      console.error("❌ Error clearing canvas:", error);
    }
  };

  // Handle topic selection
  const handleTopicSelect = async (topic: MathTopic) => {
    console.log("📚 Topic selected:", topic);

    // If session is active, we need to stop it first
    if (isSessionActive) {
      console.log("⏹️ Stopping active session before switching topic...");
      // Send stop signal to RealtimePanel (we'll handle this via state)
      setIsSessionActive(false);
    }

    // Clear the canvas
    await clearCanvas();

    // Set the new topic
    setSelectedTopic(topic);
    setCanvasUpdates([]);
  };

  // Handle start learning
  const handleStartLearning = () => {
    if (!selectedTopic) return;
    console.log("🚀 Starting learning session for topic:", selectedTopic);
    setIsSessionActive(true);
  };

  // Handle stop learning
  const handleStopLearning = () => {
    console.log("⏹️ Stopping learning session");
    setIsSessionActive(false);
  };

  return (
    <div className="fixed inset-0 flex bg-linear-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Left Sidebar: Topic Menu */}
      <TopicMenu
        selectedTopic={selectedTopic}
        onTopicSelect={handleTopicSelect}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative  bg-linear-to-br from-amber-50 via-rose-50 to-sky-50 shadow-[0_25px_55px_rgba(248,181,77,0.35)]">
        {/* Canvas Header */}
        {selectedTopic && (
          <div className="h-20 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 shadow-lg px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">
                  {selectedTopic === "circle"
                    ? "🔵"
                    : selectedTopic === "rectangle"
                    ? "📐"
                    : "🔺"}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {selectedTopic === "circle"
                      ? "Circle Quest"
                      : selectedTopic === "rectangle"
                      ? "Rectangle Lab"
                      : "Triangle Trail"}
                  </h2>
                  <p className="text-sm text-white/90 font-medium">
                    {selectedTopic === "circle"
                      ? "Discover radius, diameter, and magical π tricks"
                      : selectedTopic === "rectangle"
                      ? "Master area secrets with sides and angles"
                      : "Explore base-height adventures and shortcuts"}
                  </p>
                </div>
              </div>
            </div>
            <a
              href={canvasUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all text-white text-sm font-semibold rounded-full border-2 border-white/30"
            >
              Open in New Tab ↗
            </a>
          </div>
        )}

        {/* Canvas Iframe */}
        <div className="flex-1 overflow-hidden p-2 ">
          <iframe
            ref={iframeRef}
            src={canvasUrl}
            className="w-full h-full "
            style={{ border: "none", borderRadius: "10px" }}
            title="Excalidraw canvas"
          />
        </div>

        {/* Start Learning Button (appears when topic is selected) */}
        {selectedTopic && (
          <StartLearningButton
            topic={selectedTopic}
            isSessionActive={isSessionActive}
            onStart={handleStartLearning}
            onStop={handleStopLearning}
          />
        )}

        {/* Debug Button (bottom-right) */}
        <button
          onClick={() => setIsDebugOpen(true)}
          className="fixed bottom-8 right-8 z-40 
            w-16 h-16 rounded-full 
            bg-linear-to-br from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800
            text-white text-2xl
            shadow-2xl hover:shadow-3xl
            transition-all duration-300 
            hover:scale-110
            border-4 border-white
            flex items-center justify-center"
          title="Open Debug Console"
        >
          🐛
        </button>
      </div>

      {/* Session Controller - manages the realtime session (hidden) */}
      <SessionController
        topic={selectedTopic || "circle"}
        canvasUpdates={canvasUpdates}
        externalSessionActive={isSessionActive}
        onSessionStateChange={setIsSessionActive}
      />

      {/* Debug Dialog - displays session status */}
      <RealtimeDebugDialog
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        canvasUpdates={canvasUpdates}
      />
    </div>
  );
}
