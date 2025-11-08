"use client";

import { useEffect, useState, useRef } from "react";
import RealtimePanel from "@/components/RealtimePanel";

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
  const wsRef = useRef<WebSocket | null>(null);

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

  return (
    <div className="fixed inset-0 flex bg-gray-50">
      {/* Right side: Excalidraw Canvas (70%) */}
      <div className="w-[70vw] flex flex-col">
        <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center">
          <h2 className="text-sm font-semibold text-gray-700">
            Excalidraw Canvas
          </h2>
          <a
            href={canvasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-600 hover:text-blue-700"
          >
            Open in new tab ↗
          </a>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={canvasUrl}
            className="w-full h-full"
            style={{ border: "none" }}
            title="Excalidraw canvas"
          />
        </div>
      </div>

      {/* Left side: Realtime Console (30%) */}
      <div className="w-[30vw] border-l border-gray-300 flex flex-col bg-white">
        <RealtimePanel canvasUpdates={canvasUpdates} />
      </div>
    </div>
  );
}
