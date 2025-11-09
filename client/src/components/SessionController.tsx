"use client";

import { useRealtimeSession } from "@/hooks/useRealtimeSession";

interface CanvasUpdate {
  type: string;
  description: string;
  elementCount: number;
  timestamp: string;
}

interface SessionControllerProps {
  topic: string;
  canvasUpdates?: CanvasUpdate[];
  externalSessionActive?: boolean;
  onSessionStateChange?: (active: boolean) => void;
}

/**
 * Hidden component that controls the realtime session.
 * This is the ONLY place where a session should be created.
 * Other components should read from the Zustand store.
 */
export default function SessionController({
  topic,
  canvasUpdates = [],
  externalSessionActive,
  onSessionStateChange,
}: SessionControllerProps) {
  // This hook manages the session and updates the Zustand store
  useRealtimeSession({
    topic,
    canvasUpdates,
    externalSessionActive,
    onSessionStateChange,
  });

  // This component doesn't render anything - it just manages the session
  return null;
}

