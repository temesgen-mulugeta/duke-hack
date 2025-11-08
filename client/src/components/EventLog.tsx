"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type RealtimeEvent = {
  event_id?: string;
  type: string;
  timestamp?: string;
  [key: string]: unknown;
};

type EventProps = {
  event: RealtimeEvent;
  timestamp: string;
};

function Event({ event, timestamp }: EventProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isClient = event.event_id && !event.event_id.startsWith("event_");

  return (
    <div className="flex flex-col gap-1 p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isClient ? (
          <ChevronDown className="text-blue-500 w-3 h-3 flex-shrink-0" />
        ) : (
          <ChevronUp className="text-green-500 w-3 h-3 flex-shrink-0" />
        )}
        <div className="text-xs text-gray-700 flex-1 min-w-0 truncate">
          <span className="font-semibold text-[10px]">
            {isClient ? "CLIENT" : "SERVER"}
          </span>
          {" · "}
          <span className="text-gray-600">{event.type}</span>
        </div>
        <span className="text-[10px] text-gray-400">{timestamp}</span>
      </div>
      <div
        className={`text-gray-600 bg-gray-200 p-2 rounded overflow-x-auto transition-all ${
          isExpanded ? "block" : "hidden"
        }`}
      >
        <pre className="text-[10px] font-mono leading-relaxed">{JSON.stringify(event, null, 2)}</pre>
      </div>
    </div>
  );
}

type EventLogProps = {
  events: RealtimeEvent[];
};

export default function EventLog({ events }: EventLogProps) {
  const eventsToDisplay: JSX.Element[] = [];
  const deltaEvents: Record<string, RealtimeEvent> = {};

  events.forEach((event) => {
    if (event.type.endsWith("delta")) {
      if (deltaEvents[event.type]) {
        // for now just log a single event per render pass
        return;
      } else {
        deltaEvents[event.type] = event;
      }
    }

    eventsToDisplay.push(
      <Event
        key={event.event_id || Math.random()}
        event={event}
        timestamp={event.timestamp || ""}
      />
    );
  });

  return (
    <div className="flex flex-col gap-1">
      {events.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-4">
          No events yet...
        </div>
      ) : (
        eventsToDisplay
      )}
    </div>
  );
}

