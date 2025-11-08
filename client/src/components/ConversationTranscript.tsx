"use client";

import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useEffect, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  type: "audio" | "text";
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

export default function ConversationTranscript({
  events,
}: {
  events: RealtimeEvent[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
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

    setMessages(newMessages);
  }, [events]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No conversation yet. Start speaking or typing to begin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[calc(100vh-100px)]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold">
                  {message.role === "user" ? "You" : "AI"}
                </span>
                <span className="text-xs opacity-70">
                  {message.type === "audio" ? "🎤" : "💬"}
                </span>
                <span className="text-xs opacity-70">{message.timestamp}</span>
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
