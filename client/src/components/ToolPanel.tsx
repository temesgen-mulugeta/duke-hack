"use client";

import { useEffect, useState } from "react";

type RealtimeEvent = {
  event_id?: string;
  type: string;
  timestamp?: string;
  response?: {
    output?: Array<{
      type: string;
      name?: string;
      call_id?: string;
      arguments?: string;
      [key: string]: unknown;
    }>;
  };
  [key: string]: unknown;
};

type ToolPanelProps = {
  isSessionActive: boolean;
  sendClientEvent: (event: unknown) => void;
  events: RealtimeEvent[];
};

type FunctionCallOutput = {
  name?: string;
  call_id?: string;
  arguments?: string;
  [key: string]: unknown;
};

function FunctionCallOutput({ functionCallOutput }: { functionCallOutput: FunctionCallOutput }) {
  const argsString = functionCallOutput.arguments || "{}";
  let parsedArgs: Record<string, unknown> = {};
  
  try {
    parsedArgs = JSON.parse(argsString);
  } catch (e) {
    console.error("Failed to parse function arguments", e);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
        <p className="text-sm font-semibold text-emerald-800 mb-1">
          Tool: {functionCallOutput.name || "unknown"}
        </p>
        <p className="text-xs text-emerald-600">
          Call ID: {functionCallOutput.call_id || "unknown"}
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Arguments:</p>
        <pre className="text-xs bg-white rounded-md p-2 overflow-x-auto border border-gray-200 text-gray-800 font-mono">
          {JSON.stringify(parsedArgs, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}: ToolPanelProps) {
  const [toolsAdded, setToolsAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState<FunctionCallOutput | null>(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    // Add tools on session creation
    const firstEvent = events[events.length - 1];
    if (!toolsAdded && firstEvent.type === "session.created") {
      setToolsAdded(true);
    }

    // Check for function calls in the most recent response
    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response?.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (output.type === "function_call") {
          setFunctionCallOutput(output);
        }
      });
    }
  }, [events, toolsAdded, sendClientEvent]);

  useEffect(() => {
    if (!isSessionActive) {
      setToolsAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <div className="w-full">
      <h3 className="text-xs font-semibold text-gray-700 mb-2">Tool Activity</h3>
      {isSessionActive ? (
        functionCallOutput ? (
          <div className="space-y-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
              <p className="text-xs font-semibold text-emerald-800">
                {functionCallOutput.name || "unknown"}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                ID: {functionCallOutput.call_id?.slice(0, 8) || "unknown"}...
              </p>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                View arguments
              </summary>
              <pre className="mt-1 text-xs bg-gray-100 rounded p-2 overflow-x-auto text-gray-800">
                {functionCallOutput.arguments || "{}"}
              </pre>
            </details>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            No tool calls yet. Try: "Draw a red circle"
          </p>
        )
      ) : (
        <p className="text-xs text-gray-400">
          Start session to see tool activity
        </p>
      )}
    </div>
  );
}

