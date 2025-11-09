"use client";

import { CirclePlay, Square } from "lucide-react";
import { MathTopic } from "./TopicMenu";

interface StartLearningButtonProps {
  topic: MathTopic;
  isSessionActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

const topicStyles: Record<
  MathTopic,
  { gradient: string; glow: string; label: string }
> = {
  circle: {
    gradient: "from-sky-500 via-blue-500 to-emerald-500",
    glow: "shadow-[0_18px_45px_rgba(56,189,248,0.35)]",
    label: "Start Circle Quest",
  },
  rectangle: {
    gradient: "from-violet-500 via-indigo-500 to-fuchsia-500",
    glow: "shadow-[0_18px_45px_rgba(139,92,246,0.35)]",
    label: "Start Rectangle Lab",
  },
  triangle: {
    gradient: "from-rose-500 via-orange-500 to-amber-500",
    glow: "shadow-[0_18px_45px_rgba(244,114,182,0.35)]",
    label: "Start Triangle Trail",
  },
};

export default function StartLearningButton({
  topic,
  isSessionActive,
  onStart,
  onStop,
}: StartLearningButtonProps) {
  if (isSessionActive) {
    return (
      <button
        onClick={onStop}
        className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-linear-to-r from-rose-500 via-red-500 to-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_45px_rgba(244,63,94,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(244,63,94,0.45)]"
      >
        <Square className="h-4 w-4" />
        Stop Session
      </button>
    );
  }

  const style = topicStyles[topic];

  return (
    <button
      onClick={onStart}
      className={`inline-flex items-center gap-2.5 rounded-full border border-white/60 bg-linear-to-r ${style.gradient} px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(56,189,248,0.5)] ${style.glow}`}
    >
      <CirclePlay className="h-4 w-4" />
      {style.label}
    </button>
  );
}

