"use client";

import { useCallback, useMemo, useState } from "react";

type ToolCallState =
  | { status: "idle"; message: null }
  | { status: "loading"; message: null }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const DEFAULT_EXPRESSION = "2x+5";

export default function TestToolCallPanel() {
  const [state, setState] = useState<ToolCallState>({
    status: "idle",
    message: null,
  });

  const statusLabel = useMemo(() => {
    switch (state.status) {
      case "idle":
        return "Call MCP Tool";
      case "loading":
        return "Calling…";
      case "success":
        return "Call again";
      case "error":
        return "Retry call";
      default:
        return "Call MCP Tool";
    }
  }, [state.status]);

  const callTool = useCallback(async () => {
    setState({ status: "loading", message: null });

    try {
      const response = await fetch("/api/tools/create-expression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }

      const data = await response.json();
      setState({
        status: "success",
        message: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to call MCP tool.",
      });
    }
  }, []);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900">
          Manual MCP Tool Test
        </h2>
        <p className="text-sm text-zinc-600">
          Calls the `create_from_mermaid` tool directly to render the expression{" "}
          <code>{DEFAULT_EXPRESSION}</code>.
        </p>
      </div>

      <button
        type="button"
        onClick={callTool}
        disabled={state.status === "loading"}
        className="w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {statusLabel}
      </button>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">Call Result</h3>
        {state.status === "idle" && (
          <p className="text-sm text-zinc-500">
            Click the button above to call the MCP tool manually.
          </p>
        )}
        {state.status === "loading" && (
          <p className="text-sm text-zinc-500">Calling tool…</p>
        )}
        {state.status === "error" && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}
        {state.status === "success" && (
          <pre className="max-h-64 overflow-y-auto rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            {state.message}
          </pre>
        )}
      </div>
    </section>
  );
}
