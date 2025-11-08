"use client";

import RealtimePanel from "@/components/RealtimePanel";

export default function Home() {
  const canvasUrl =
    process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://localhost:3000";

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
        <RealtimePanel />
      </div>
    </div>
  );
}
