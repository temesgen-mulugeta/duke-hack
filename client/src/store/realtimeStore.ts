import { create } from "zustand";

type RealtimeEvent = {
  event_id?: string;
  type: string;
  timestamp?: string;
  session?: {
    tools?: Array<{
      type: string;
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  };
  item?: {
    type?: string;
    role?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
    output?: string;
  };
  [key: string]: unknown;
};

interface RealtimeState {
  // Session state
  isSessionActive: boolean;
  events: RealtimeEvent[];
  toolsRegistered: boolean;
  registeredTools: string[];
  executingTool: string | null;
  microphoneActive: boolean;
  isListening: boolean;
  audioBlocked: boolean;
  currentTopic: string;
  sendTextMessage?: (message: string) => void;

  // Actions
  setSessionActive: (active: boolean) => void;
  addEvent: (event: RealtimeEvent) => void;
  setEvents: (events: RealtimeEvent[]) => void;
  setToolsRegistered: (registered: boolean, tools: string[]) => void;
  setExecutingTool: (tool: string | null) => void;
  setMicrophoneActive: (active: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setAudioBlocked: (blocked: boolean) => void;
  setCurrentTopic: (topic: string) => void;
  setSendTextMessage: (sender?: (message: string) => void) => void;
  resetSession: () => void;
}

const initialState = {
  isSessionActive: false,
  events: [],
  toolsRegistered: false,
  registeredTools: [],
  executingTool: null,
  microphoneActive: false,
  isListening: false,
  audioBlocked: false,
  currentTopic: "circle",
  sendTextMessage: undefined as RealtimeState["sendTextMessage"],
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  ...initialState,

  setSessionActive: (active) => set({ isSessionActive: active }),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events],
    })),

  setEvents: (events) => set({ events }),

  setToolsRegistered: (registered, tools) =>
    set({
      toolsRegistered: registered,
      registeredTools: tools,
    }),

  setExecutingTool: (tool) => set({ executingTool: tool }),

  setMicrophoneActive: (active) => set({ microphoneActive: active }),

  setIsListening: (listening) => set({ isListening: listening }),

  setAudioBlocked: (blocked) => set({ audioBlocked: blocked }),

  setCurrentTopic: (topic) => set({ currentTopic: topic }),

  setSendTextMessage: (sender) => set({ sendTextMessage: sender }),

  resetSession: () => set(initialState),
}));
