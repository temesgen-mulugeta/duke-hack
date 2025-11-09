"use client";

import { useState } from "react";
import ConversationTranscript from "./ConversationTranscript";
import { useRealtimeStore } from "@/store/realtimeStore";

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

interface ChatSidebarProps {
  canvasUpdates?: CanvasUpdate[];
  isSessionActive: boolean;
}

export default function ChatSidebar({
  canvasUpdates = [],
  isSessionActive,
}: ChatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");

  // Read state from Zustand store
  const { events, sendTextMessage } = useRealtimeStore();

  if (!isSessionActive) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && sendTextMessage) {
      sendTextMessage(message);
      setMessage("");
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-40
          rounded-l-lg
          bg-linear-to-b from-emerald-500 to-emerald-700
          hover:from-emerald-600 hover:to-emerald-800
          text-white font-bold
          shadow-xl hover:shadow-2xl
          transition-all duration-300
          flex items-center justify-center
          ${isExpanded ? "w-10 h-20" : "w-12 h-24 animate-pulse"}`}
        title={isExpanded ? "Collapse Chat" : "Expand Chat"}
      >
        <span className="text-2xl">
          {isExpanded ? "›" : "‹"}
        </span>
      </button>

      {/* Chat Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full z-30 
          bg-white shadow-2xl border-l-4 border-emerald-500
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isExpanded ? "w-96" : "w-0 overflow-hidden"}`}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-4 border-b border-gray-200 bg-linear-to-r from-emerald-500 to-emerald-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <h2 className="text-lg font-bold text-white">
                Learning Chat
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-xs text-white/90">Active</span>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <ConversationTranscript
            events={events}
            canvasUpdates={canvasUpdates}
          />
        </div>

        {/* Message Input */}
        <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question or type a message..."
              className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                text-gray-800 resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </span>
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-6 py-2 bg-linear-to-r from-emerald-500 to-emerald-600 
                  hover:from-emerald-600 hover:to-emerald-700
                  text-white text-sm font-bold rounded-lg
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:scale-105 disabled:hover:scale-100
                  shadow-lg hover:shadow-xl"
              >
                Send 🚀
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

