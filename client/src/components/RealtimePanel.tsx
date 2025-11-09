"use client";

import EventLog from "./EventLog";
import ToolPanel from "./ToolPanel";
import ConversationTranscript from "./ConversationTranscript";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeStore } from "@/store/realtimeStore";

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

interface RealtimePanelProps {
  canvasUpdates?: CanvasUpdate[];
  sendTextMessage?: (message: string) => void;
  sendClientEvent?: (event: unknown) => void;
  enableAudio?: () => void;
}

/**
 * Display-only component that shows the realtime session status.
 * This reads from the Zustand store and doesn't create its own session.
 * The session is controlled by SessionController component.
 */
export default function RealtimePanel({
  canvasUpdates = [],
  sendTextMessage,
  sendClientEvent,
  enableAudio,
}: RealtimePanelProps) {
  // Read state from Zustand store (read-only)
  const {
    isSessionActive,
    events,
    toolsRegistered,
    registeredTools,
    executingTool,
    microphoneActive,
    isListening,
    audioBlocked,
  } = useRealtimeStore();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-emerald-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900">
            Realtime Console (Debug View)
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

        {/* Info message */}
        <div className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          ℹ️ Session is controlled by the &ldquo;Start Learning&rdquo; button
        </div>

        {/* Audio Blocked Warning */}
        {audioBlocked && enableAudio && (
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

      {/* Message Input (optional) */}
      {isSessionActive && sendTextMessage && (
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
            {sendClientEvent ? (
              <ToolPanel
                sendClientEvent={sendClientEvent}
                events={events}
                isSessionActive={isSessionActive}
              />
            ) : (
              <div className="text-xs text-gray-500">
                Tool panel not available in debug mode
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
