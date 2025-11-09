"use client";

import { useEffect, useState, useRef } from "react";
import TopicMenu, { MathTopic } from "@/components/TopicMenu";
import RealtimeDebugDialog from "@/components/RealtimeDebugDialog";
import SessionController from "@/components/SessionController";
import ChatSidebar from "@/components/ChatSidebar";
import TopicHighlightCard from "@/components/TopicHighlightCard";
import LearningControlDock from "@/components/LearningControlDock";

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
        console.log(
          `📊 Server state: ${result.currentSize} elements, ${result.clientsNotified} clients notified`
        );

        // Wait for the WebSocket broadcast to propagate to all clients
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Verify the clear worked by checking the server state
        const verifyResponse = await fetch(`${canvasUrl}/api/elements`);
        const verifyResult = await verifyResponse.json();

        if (verifyResult.success && verifyResult.count === 0) {
          console.log("✅ Verified: Canvas is empty");
          return true;
        } else {
          console.warn(
            `⚠️ Warning: Canvas still has ${verifyResult.count} elements after clear`
          );
          return verifyResult.count === 0;
        }
      } else {
        console.error("❌ Failed to clear canvas:", result.error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error clearing canvas:", error);
      return false;
    }
  };

  // Write header to canvas
  const writeHeaderToCanvas = async (topic: MathTopic) => {
    try {
      console.log("✍️ Writing header to canvas...");

      const headers = {
        circle: {
          title: "Circle Quest",
          emoji: "🔵",
          subtitle: "Discover radius, diameter, and magical π tricks",
        },
        rectangle: {
          title: "Rectangle Lab",
          emoji: "📐",
          subtitle: "Master area secrets with sides and angles",
        },
        triangle: {
          title: "Triangle Trail",
          emoji: "🔺",
          subtitle: "Explore base-height adventures and shortcuts",
        },
      };

      const header = headers[topic];

      // Create title element (large text)
      const titleResponse = await fetch(`${canvasUrl}/api/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          x: 600, // right top corner (assuming 800px width canvas, 50px padding)
          y: 100,
          text: `${header.emoji} ${header.title}`,
          fontSize: 48,
          strokeColor: "#1e40af", // blue-800
        }),
      });

      // Create subtitle element (smaller text)
      const subtitleResponse = await fetch(`${canvasUrl}/api/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          x: 600,
          y: 170,
          text: header.subtitle,
          fontSize: 20,
          strokeColor: "#6b7280", // gray-500
        }),
      });

      const titleResult = await titleResponse.json();
      const subtitleResult = await subtitleResponse.json();

      if (titleResult.success && subtitleResult.success) {
        console.log("✅ Header written to canvas successfully");
      } else {
        console.error("❌ Failed to write header to canvas");
      }
    } catch (error) {
      console.error("❌ Error writing header to canvas:", error);
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

    // Clear the canvas and wait for it to complete
    const cleared = await clearCanvas();

    // Only write header if canvas was successfully cleared
    if (cleared) {
      // Write header to canvas
      await writeHeaderToCanvas(topic);
    } else {
      console.error("❌ Skipping header write - canvas clear failed");
    }

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

  const handleRefreshTopic = async () => {
    if (!selectedTopic) return;
    await clearCanvas();
    await writeHeaderToCanvas(selectedTopic);
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-linear-to-br from-sky-50 via-violet-50 to-rose-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_65%)]" />
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-linear-to-br from-sky-200/65 to-violet-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-16 h-80 w-80 rounded-full bg-linear-to-br from-pink-200/70 to-amber-200/60 blur-3xl" />

      <div className="relative z-10 flex h-full w-full">
        <TopicMenu
          selectedTopic={selectedTopic}
          onTopicSelect={handleTopicSelect}
        />

        <main className="relative flex min-w-0 flex-1 px-6 py-6">
          <div className="relative flex-1 overflow-hidden rounded-[40px] border border-white/60 bg-white/45 shadow-[0_35px_80px_rgba(79,70,229,0.12)] backdrop-blur-xl">
            <iframe
              ref={iframeRef}
              src={canvasUrl}
              className="absolute inset-0 h-full w-full"
              style={{ border: "none" }}
              title="Excalidraw canvas"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_70%)]" />

            <div className="pointer-events-none absolute inset-0">
              <div className="flex items-center justify-between px-8 pt-6">
                <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/85 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500 shadow">
                  {isSessionActive ? "Session Active" : "Awaiting Session"}
                </div>
                <button
                  onClick={() => setIsDebugOpen(true)}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/85 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-600 shadow transition hover:-translate-y-0.5 hover:shadow-md"
                  title="Open realtime debug console"
                >
                  Diagnostics
                </button>
              </div>

              {/* <div className="mt-6 flex justify-center px-6">
                <div className="pointer-events-auto w-full max-w-xl">
                  <TopicHighlightCard
                    topic={selectedTopic}
                    canvasUrl={canvasUrl}
                    variant="overlay"
                  />
                </div>
              </div> */}

              <div className="pointer-events-auto absolute bottom-8 left-0 right-0 flex justify-center px-6">
                <div className="w-full max-w-2xl">
                  <LearningControlDock
                    selectedTopic={selectedTopic}
                    isSessionActive={isSessionActive}
                    onClearTopic={handleRefreshTopic}
                    onStart={handleStartLearning}
                    onStop={handleStopLearning}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        <ChatSidebar
          canvasUpdates={canvasUpdates}
          isSessionActive={isSessionActive}
        />
      </div>

      <SessionController
        topic={selectedTopic || "circle"}
        canvasUpdates={canvasUpdates}
        externalSessionActive={isSessionActive}
        onSessionStateChange={setIsSessionActive}
      />

      <RealtimeDebugDialog
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        canvasUpdates={canvasUpdates}
      />
    </div>
  );
}
