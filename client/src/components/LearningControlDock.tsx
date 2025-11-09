"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import StartLearningButton from "@/components/StartLearningButton";
import type { MathTopic } from "@/components/TopicMenu";

const topicCopy: Record<
  MathTopic,
  {
    tagline: string;
    badge: string;
    accent: string;
  }
> = {
  circle: {
    tagline: "Learn about radius, diameter, chords, and the magic of π.",
    badge: "Curvy thinking",
    accent: "text-sky-600",
  },
  rectangle: {
    tagline: "Count squares, compare sides, and design bold blueprints.",
    badge: "Architect mode",
    accent: "text-violet-600",
  },
  triangle: {
    tagline: "Balance angles, stack heights, and solve mysterious puzzles.",
    badge: "Explorer spirit",
    accent: "text-rose-600",
  },
};

interface LearningControlDockProps {
  selectedTopic: MathTopic | null;
  isSessionActive: boolean;
  onClearTopic: () => void | Promise<void>;
  onStart: () => void;
  onStop: () => void;
  compact?: boolean;
}

export default function LearningControlDock({
  selectedTopic,
  isSessionActive,
  onClearTopic,
  onStart,
  onStop,
  compact = false,
}: LearningControlDockProps) {
  if (!selectedTopic) {
    return (
      <div
        className={`mx-auto w-full rounded-3xl border border-dashed border-slate-200 bg-white/80 text-center shadow-lg backdrop-blur ${
          compact ? "max-w-xl px-5 py-5" : "max-w-2xl px-6 py-8"
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-sky-500/90 to-violet-500/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-violet-500/30">
          <Sparkles className="h-4 w-4" />
          Start here
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-800">
          Select a concept to unlock the control panel
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Your guided session controls will appear once you pick something from
          the concept tree. Each session keeps things playful and focused.
        </p>
      </div>
    );
  }

  const copy = topicCopy[selectedTopic];

  return (
    <div
      className={`mx-auto w-full rounded-3xl border border-white/60 bg-white/85 shadow-xl shadow-sky-200/40 backdrop-blur-lg ${
        compact ? "max-w-2xl px-5 py-4" : "max-w-3xl px-6 py-5"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700">
            {isSessionActive ? "Session running" : "Session ready"}
          </div>
          <div>
            <p className={`text-base font-semibold ${copy.accent}`}>
              {copy.tagline}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Badge unlocked:{" "}
              <span className="font-black text-slate-700">{copy.badge}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void onClearTopic()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh canvas
          </button>
          <StartLearningButton
            topic={selectedTopic}
            isSessionActive={isSessionActive}
            onStart={onStart}
            onStop={onStop}
          />
        </div>
      </div>
    </div>
  );
}


