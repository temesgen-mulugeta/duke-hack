"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  GraduationCap,
  Shapes,
  Sparkles,
} from "lucide-react";

export type MathTopic = "circle" | "rectangle" | "triangle";

interface TopicMenuProps {
  selectedTopic: MathTopic | null;
  onTopicSelect: (topic: MathTopic) => void;
}

type ConceptTopic = {
  id: MathTopic;
  title: string;
  summary: string;
  badge: string;
  icon: string;
  accent: string;
};

type ConceptStrand = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  topics: ConceptTopic[];
};

type ConceptSection = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  strands: ConceptStrand[];
};

const conceptTree: ConceptSection[] = [
  {
    id: "geometry-explorer",
    title: "Geometry Explorer",
    description: "Build a friendly toolkit of shapes, angles, and patterns.",
    icon: <Compass className="h-5 w-5" />,
    accent: "from-sky-100/80 via-white to-slate-50/80",
    strands: [
      {
        id: "shape-sidekicks",
        title: "Area Calculations",
        description: "Meet the characters behind every drawing challenge.",
        icon: <Shapes className="h-4 w-4" />,
        topics: [
          {
            id: "circle",
            title: "Circle Quest",
            summary: "Trace smooth curves and measure magic radii.",
            badge: "Circle Area",
            icon: "🔵",
            accent:
              "border-sky-200 bg-sky-50/80 text-sky-700 shadow-sky-200/40",
          },
          {
            id: "rectangle",
            title: "Rectangle Lab",
            summary: "Plan blueprints with precise sides and corners.",
            badge: "Rectangle Area",
            icon: "📐",
            accent:
              "border-violet-200 bg-violet-50/80 text-violet-700 shadow-violet-200/40",
          },
          {
            id: "triangle",
            title: "Triangle Trail",
            summary: "Balance angles and heights to solve puzzles.",
            badge: "Triangle Area",
            icon: "🔺",
            accent:
              "border-rose-200 bg-rose-50/80 text-rose-700 shadow-rose-200/40",
          },
        ],
      },
    ],
  },
  {
    id: "problem-solvers",
    title: "Problem Solvers",
    description: "Practice quick challenges that blend art with logic.",
    icon: <BookOpenCheck className="h-5 w-5" />,
    accent: "from-violet-100/80 via-white to-pink-50/80",
    strands: [
      {
        id: "skill-boosts",
        title: "Skill Boosts",
        description: "Stretch your thinking with mini missions.",
        icon: <GraduationCap className="h-4 w-4" />,
        topics: [
          {
            id: "circle",
            title: "Arc Adventures",
            summary: "Estimate areas and compare chord lengths.",
            badge: "Precision boost",
            icon: "🧭",
            accent:
              "border-sky-200 bg-sky-50/80 text-sky-700 shadow-sky-200/40",
          },
          {
            id: "rectangle",
            title: "Pattern Studios",
            summary: "Tile boards, flip shapes, and spot equal areas.",
            badge: "Pattern play",
            icon: "🪄",
            accent:
              "border-violet-200 bg-violet-50/80 text-violet-700 shadow-violet-200/40",
          },
          {
            id: "triangle",
            title: "Elevated Peaks",
            summary: "Stack heights, bisect angles, and compare sides.",
            badge: "Angle ace",
            icon: "⛰️",
            accent:
              "border-rose-200 bg-rose-50/80 text-rose-700 shadow-rose-200/40",
          },
        ],
      },
    ],
  },
];

export default function TopicMenu({
  selectedTopic,
  onTopicSelect,
}: TopicMenuProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      conceptTree.reduce(
        (acc, section) => ({
          ...acc,
          [section.id]: true,
        }),
        {} as Record<string, boolean>
      )
  );

  const [openStrands, setOpenStrands] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const section of conceptTree) {
        for (const strand of section.strands) {
          initial[strand.id] = true;
        }
      }
      return initial;
    }
  );

  const topicBadge = useMemo(() => {
    if (!selectedTopic) return null;
    for (const section of conceptTree) {
      for (const strand of section.strands) {
        const topic = strand.topics.find((t) => t.id === selectedTopic);
        if (topic) return topic.badge;
      }
    }
    return null;
  }, [selectedTopic]);

  return (
    <aside className="relative flex h-full w-[320px] flex-none flex-col overflow-hidden border-r border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="pointer-events-none absolute -top-10 -left-12 h-44 w-44 rounded-full bg-linear-to-br from-sky-200/70 to-violet-200/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-0 h-40 w-40 rounded-full bg-linear-to-br from-pink-200/70 to-amber-200/70 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_70%)]" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="px-6 pb-6 pt-8">
          <div className="space-y-3">
            {/* <div className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-sky-500/90 to-indigo-500/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-4 w-4" />
              Concept tree
            </div> */}
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                Learning Adventures
              </h1>
              <p className="mt-2 text-xs font-medium text-slate-600">
                Follow the branches to discover playful quests and skills. Pick
                any leaf to draw along and earn badges.
              </p>
            </div>
            {/* {topicBadge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow">
                🎉 Current badge:{" "}
                <span className="font-black text-slate-800">{topicBadge}</span>
              </div>
            )} */}
          </div>
        </header>

        <nav className="flex-1 overflow-y-auto px-4 pb-10">
          <div className="space-y-4">
            {conceptTree.map((section) => {
              const sectionOpen = openSections[section.id];
              return (
                <section
                  key={section.id}
                  className="overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-lg shadow-slate-200/30"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 border-b border-white/60 px-5 py-4 text-left transition-colors hover:bg-slate-50/70"
                    aria-expanded={sectionOpen}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-md">
                        {section.icon}
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-800">
                          {section.title}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`transition-transform ${
                        sectionOpen ? "rotate-90" : ""
                      }`}
                    >
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>

                  <div
                    className={`grid gap-3 bg-linear-to-br ${
                      section.accent
                    } px-4 pb-5 pt-4 transition-[max-height,opacity] duration-300 ${
                      sectionOpen ? "opacity-100" : "max-h-0 opacity-0"
                    }`}
                    style={{
                      maxHeight: sectionOpen ? "1000px" : "0px",
                    }}
                  >
                    {section.strands.map((strand) => {
                      const strandOpen = openStrands[strand.id];
                      return (
                        <article
                          key={strand.id}
                          className="overflow-hidden rounded-2xl border border-white/60 bg-white/75 shadow-inner"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenStrands((prev) => ({
                                ...prev,
                                [strand.id]: !prev[strand.id],
                              }))
                            }
                            className="flex w-full items-center justify-between gap-3 border-b border-white/50 px-4 py-3 text-left hover:bg-white/80"
                            aria-expanded={strandOpen}
                          >
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 shadow">
                                {strand.icon}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-700">
                                  {strand.title}
                                </h3>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {strand.description}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform ${
                                strandOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          <div
                            className={`space-y-2 px-4 pb-4 pt-3 transition-[max-height,opacity] duration-300 ${
                              strandOpen ? "opacity-100" : "max-h-0 opacity-0"
                            }`}
                            style={{
                              maxHeight: strandOpen ? "600px" : "0px",
                            }}
                          >
                            {strand.topics.map((topic) => {
                              const isSelected = selectedTopic === topic.id;
                              return (
                                <button
                                  key={topic.title + topic.id + strand.id}
                                  onClick={() => onTopicSelect(topic.id)}
                                  className={`group relative flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                                    isSelected
                                      ? `border-transparent bg-linear-to-br from-emerald-400/90 to-sky-500/90 text-white shadow-xl`
                                      : `${topic.accent} hover:bg-white/90`
                                  }`}
                                >
                                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/90 text-xl shadow-inner">
                                    {topic.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`text-sm font-black ${
                                          isSelected
                                            ? "text-white"
                                            : "text-slate-700"
                                        }`}
                                      >
                                        {topic.title}
                                      </span>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                                          isSelected
                                            ? "border-white/60 text-emerald-100"
                                            : "border-slate-200 bg-white/70 text-slate-500"
                                        }`}
                                      >
                                        {topic.badge}
                                      </span>
                                    </div>
                                    {/* <p
                                      className={`mt-1 text-xs font-medium ${
                                        isSelected
                                          ? "text-white/90"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {topic.summary}
                                    </p> */}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute -top-2 -right-2 rounded-full bg-white/90 p-1 shadow-lg">
                                      <Sparkles className="h-4 w-4 text-emerald-500" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
