"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo, useEffect, useRef } from "react";

type Message = {
  id: string;
  role: "user" | "assistant" | "canvas";
  content: string;
  timestamp: string;
  type: "audio" | "text" | "canvas";
};

type RealtimeEvent = {
  type: string;
  item?: {
    type?: string;
    role?: string;
    content?: Array<{
      type: string;
      text?: string;
      transcript?: string;
    }>;
  };
  transcript?: string;
  delta?: string;
  [key: string]: unknown;
};

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

export default function ConversationTranscript({
  events,
  canvasUpdates,
}: {
  events: RealtimeEvent[];
  canvasUpdates?: CanvasUpdate[];
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const newMessages: Message[] = [];
    let currentAssistantMessage: Message | null = null;
    const processedIds = new Set<string>();

    // Process events in reverse order (oldest first)
    const sortedEvents = [...events].reverse();

    for (const event of sortedEvents) {
      const timestamp =
        (event as { timestamp?: string }).timestamp ||
        new Date().toLocaleTimeString();
      const eventId = (event as { event_id?: string }).event_id || "";

      // User text messages
      if (
        event.type === "conversation.item.created" &&
        event.item?.role === "user" &&
        event.item?.type === "message"
      ) {
        const content =
          event.item.content?.[0]?.text ||
          event.item.content?.[0]?.transcript ||
          "";
        if (content && !processedIds.has(`user-${eventId}`)) {
          processedIds.add(`user-${eventId}`);
          newMessages.push({
            id: eventId || crypto.randomUUID(),
            role: "user",
            content,
            timestamp,
            type: "text",
          });
        }
      }

      // User audio transcriptions
      if (
        event.type === "conversation.item.input_audio_transcription.completed"
      ) {
        const transcript = event.transcript as string;
        if (transcript && !processedIds.has(`user-audio-${eventId}`)) {
          processedIds.add(`user-audio-${eventId}`);
          newMessages.push({
            id: eventId || crypto.randomUUID(),
            role: "user",
            content: transcript,
            timestamp,
            type: "audio",
          });
        }
      }

      // Assistant text responses
      if (event.type === "response.text.done" && event.item) {
        const content = event.item.content?.[0]?.text || "";
        if (content && !processedIds.has(`assistant-text-${eventId}`)) {
          processedIds.add(`assistant-text-${eventId}`);
          newMessages.push({
            id: eventId || crypto.randomUUID(),
            role: "assistant",
            content,
            timestamp,
            type: "text",
          });
        }
      }

      // Assistant audio transcripts (deltas) - accumulate
      if (event.type === "response.audio_transcript.delta") {
        const delta = event.delta as string;
        if (delta) {
          if (currentAssistantMessage) {
            currentAssistantMessage.content += delta;
          } else {
            currentAssistantMessage = {
              id: `assistant-${timestamp}`,
              role: "assistant",
              content: delta,
              timestamp,
              type: "audio",
            };
          }
        }
      }

      // Assistant audio transcript done - finalize message
      if (event.type === "response.audio_transcript.done") {
        if (
          currentAssistantMessage &&
          !processedIds.has(currentAssistantMessage.id)
        ) {
          processedIds.add(currentAssistantMessage.id);
          newMessages.push(currentAssistantMessage);
          currentAssistantMessage = null;
        }
      }

      // Response done - finalize any pending message
      if (event.type === "response.done") {
        if (
          currentAssistantMessage &&
          !processedIds.has(currentAssistantMessage.id)
        ) {
          processedIds.add(currentAssistantMessage.id);
          newMessages.push(currentAssistantMessage);
          currentAssistantMessage = null;
        }
      }
    }

    // Add any remaining assistant message
    if (
      currentAssistantMessage &&
      !processedIds.has(currentAssistantMessage.id)
    ) {
      newMessages.push(currentAssistantMessage);
    }

    // Add canvas updates
    if (canvasUpdates) {
      for (const update of canvasUpdates) {
        const canvasId = `canvas-${update.timestamp}`;
        if (!processedIds.has(canvasId)) {
          processedIds.add(canvasId);
          newMessages.push({
            id: canvasId,
            role: "canvas",
            content: update.description,
            timestamp: new Date(update.timestamp).toLocaleTimeString(),
            type: "canvas",
          });
        }
      }
    }

    // Sort all messages by timestamp
    newMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    return newMessages;
  }, [events, canvasUpdates]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No conversation yet. Start speaking or typing to begin.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full max-h-[700px]">
      <div className="space-y-3 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "canvas"
                ? "justify-center"
                : message.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "canvas"
                  ? "bg-blue-50 text-blue-900 border border-blue-200"
                  : message.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold">
                  {message.role === "canvas"
                    ? "Canvas Action"
                    : message.role === "user"
                    ? "You"
                    : "AI"}
                </span>
                <span className="text-xs opacity-70">
                  {message.type === "canvas"
                    ? "🎨"
                    : message.type === "audio"
                    ? "🎤"
                    : "💬"}
                </span>
                <span className="text-xs opacity-70">{message.timestamp}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        ))}
        {/* Invisible div to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
