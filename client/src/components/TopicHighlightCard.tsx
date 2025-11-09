"use client";

import { Sparkles, Wand2 } from "lucide-react";
import type { MathTopic } from "@/components/TopicMenu";

const topicDetails: Record<
  MathTopic,
  {
    title: string;
    emoji: string;
    subtitle: string;
    accent: string;
    fact: string;
  }
> = {
  circle: {
    title: "Circle Quest",
    emoji: "🔵",
    subtitle: "Learn about radius, diameter, chords, and the magic of π.",
    accent: "from-sky-100/80 via-white/90 to-emerald-50/90",
    fact: "Circles have the same curvature at every single point!",
  },
  rectangle: {
    title: "Rectangle Lab",
    emoji: "📐",
    subtitle: "Tinker with lines, corners, and the secrets of area.",
    accent: "from-violet-100/80 via-white/90 to-pink-50/90",
    fact: "Rectangles are the sturdy bricks of most architecture.",
  },
  triangle: {
    title: "Triangle Trail",
    emoji: "🔺",
    subtitle: "Follow trails of base, height, and dazzling angles.",
    accent: "from-rose-100/80 via-white/90 to-amber-50/90",
    fact: "Triangles never wobble — they're the strongest shape for bridges!",
  },
};

interface TopicHighlightCardProps {
  topic: MathTopic | null;
  canvasUrl: string;
  variant?: "default" | "overlay";
}

export default function TopicHighlightCard({
  topic,
  canvasUrl,
  variant = "default",
}: TopicHighlightCardProps) {
  const isOverlay = variant === "overlay";
  const wrapperBase = isOverlay
    ? "rounded-3xl border border-white/60 bg-white/90 backdrop-blur"
    : "rounded-3xl border border-white/70 bg-white/80 backdrop-blur";
  const headingClass = isOverlay
    ? "text-xl font-bold text-slate-800"
    : "text-3xl font-black text-slate-800";
  const bodyClass = isOverlay
    ? "text-sm font-medium text-slate-600"
    : "text-sm font-medium text-slate-600";
  const badgeClass = isOverlay ? "px-3 py-1 text-[10px]" : "px-4 py-2 text-xs";
  const accentWrapper = "bg-linear-to-br";

  if (!topic) {
    return (
      <div
        className={`relative overflow-hidden ${wrapperBase} ${
          isOverlay ? "p-5 shadow-lg" : "p-6 shadow-lg"
        }`}
      >
        <div className="absolute -top-10 -right-8 h-36 w-36 rounded-full bg-linear-to-br from-sky-200/60 to-violet-200/60 blur-3xl" />
        <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-linear-to-br from-pink-200/60 to-amber-200/60 blur-3xl" />
        <div className="relative flex flex-col gap-3">
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full bg-linear-to-r from-indigo-500/90 to-sky-500/90 ${badgeClass} font-semibold uppercase tracking-[0.24em] text-white shadow-lg shadow-indigo-500/30`}
          >
            <Sparkles className="h-4 w-4" />
            Ready to explore
          </div>
          <div>
            <h2 className={headingClass}>
              Choose a concept to begin your adventure
            </h2>
            <p className={`mt-2 max-w-xl ${bodyClass}`}>
              Pick a topic from the concept tree to unlock guided drawing tips,
              mini challenges, and a helpful coach on the right. Each concept is
              designed to keep math playful while sharpening real skills.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 md:text-sm">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/70 px-3 py-2">
              🪄 Guided canvas prompts
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/70 px-3 py-2">
              🎨 Draw-along tips
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/70 px-3 py-2">
              🤖 Smart tutor chat
            </span>
          </div>
        </div>
      </div>
    );
  }

  const detail = topicDetails[topic];

  return (
    <div
      className={`relative overflow-hidden ${wrapperBase} ${accentWrapper} ${detail.accent} ${
        isOverlay ? "p-5 shadow-xl" : "p-6 shadow-xl"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_65%)]" />
      <div className="absolute -bottom-6 -right-8 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/75 text-2xl shadow-lg">
              {detail.emoji}
            </div>
            <div>
              <h2 className={headingClass}>{detail.title}</h2>
              <p className={`mt-1 ${bodyClass}`}>{detail.subtitle}</p>
            </div>
          </div>
          <a
            href={canvasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow transition hover:-translate-y-0.5 hover:shadow-md md:text-sm"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Open canvas in new tab
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-white/65 bg-white/80 p-3 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              What we will explore
            </h3>
            <p className={`mt-2 ${bodyClass}`}>{detail.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/65 bg-white/80 p-3 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Fun fact
            </h3>
            <p className={`mt-2 text-sm font-semibold text-slate-600`}>
              {detail.fact}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
