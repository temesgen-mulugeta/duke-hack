"use client";

import { useState } from "react";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  Send,
  Stars,
} from "lucide-react";
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

  const { events, sendTextMessage } = useRealtimeStore();

  const sendMessage = () => {
    if (!message.trim() || !sendTextMessage || !isSessionActive) return;
    sendTextMessage(message);
    setMessage("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <>
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="fixed right-6 top-1/2 z-40 flex -translate-y-1/2 items-center gap-3 rounded-full bg-linear-to-r from-indigo-500 to-sky-500 px-5 py-3 text-sm font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-indigo-500/40 transition hover:-translate-y-[55%] hover:shadow-indigo-500/50"
          title="Open learning coach"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        className={`fixed bottom-6 right-6 top-6 z-40 transition-[transform,opacity] duration-300 ${
          isExpanded
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <div className="flex h-full w-[360px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-2xl shadow-slate-300/50 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/60 bg-linear-to-r from-sky-500/90 to-indigo-500/90 px-5 py-4 text-white">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/90">
                <Bot className="h-3.5 w-3.5" />
                Learning coach
              </div>
              <h2 className="text-lg font-bold leading-tight">
                Friendly helper by your side
              </h2>
              <p className="text-xs font-medium text-white/80">
                Ask questions, get drawing tips, and celebrate progress.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded-full border border-white/50 bg-white/20 p-2 text-white transition hover:bg-white/30"
              title="Collapse coach"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-linear-to-b from-slate-50/90 to-white/80">
            {isSessionActive ? (
              <ConversationTranscript
                events={events}
                canvasUpdates={canvasUpdates}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
                <Stars className="h-10 w-10 text-indigo-400" />
                <p className="text-sm font-semibold">
                  Start a learning session to chat with your coach.
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Choose a concept and tap “Start Session” to unlock tips,
                  hints, and encouragement.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/60 bg-white/80 px-5 py-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  isSessionActive
                    ? "Ask a question or describe what you want to draw…"
                    : "Start a session to enable chat"
                }
                disabled={!isSessionActive}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Enter to send · Shift + Enter for a new line</span>
                <button
                  type="submit"
                  disabled={
                    !isSessionActive || !message.trim() || !sendTextMessage
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-indigo-500 to-sky-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  Send
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

