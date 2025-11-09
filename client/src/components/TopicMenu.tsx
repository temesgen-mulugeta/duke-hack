"use client";

export type MathTopic = "circle" | "rectangle" | "triangle";

interface TopicMenuProps {
  selectedTopic: MathTopic | null;
  onTopicSelect: (topic: MathTopic) => void;
}

export default function TopicMenu({
  selectedTopic,
  onTopicSelect,
}: TopicMenuProps) {
  const topics: {
    id: MathTopic;
    name: string;
    icon: string;
    color: string;
    gradient: string;
    description: string;
  }[] = [
    {
      id: "circle",
      name: "Circle Quest",
      icon: "🔵",
      color: "text-sky-600",
      gradient: "from-sky-400 via-sky-500 to-sky-600",
      description: "Discover radius, diameter, and magical π tricks.",
    },
    {
      id: "rectangle",
      name: "Rectangle Lab",
      icon: "📐",
      color: "text-violet-600",
      gradient: "from-violet-400 via-violet-500 to-purple-600",
      description: "Master area secrets with sides and angles in sync.",
    },
    {
      id: "triangle",
      name: "Triangle Trail",
      icon: "🔺",
      color: "text-rose-600",
      gradient: "from-rose-400 via-pink-500 to-rose-600",
      description: "Explore base-height adventures and clever shortcuts.",
    },
  ];

  return (
    <div className="relative w-72 h-full overflow-hidden">
      <div className="absolute -top-24 -left-28 h-56 w-56 rounded-full bg-orange-200/70 blur-3xl" />
      <div className="absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-rose-300/60 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_60%)]" />

      <div className="relative flex h-full flex-col p-6">
        {/* Header */}
        <div className="mb-6 space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-500 shadow-sm">
            ✨ Featured Quest
          </span>
          <h1 className="text-3xl font-black leading-tight text-transparent bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text drop-shadow-sm">
            Math Adventures
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Choose a learning journey and let the canvas guide your creativity.
          </p>
        </div>

        {/* Category Title */}
        <div className="mb-4 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-inner">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-linear-to-br from-orange-300 to-pink-300 text-lg shadow-md">
              📏
            </span>
            Geometry Journeys
          </h2>
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            Spark curiosity with hands-on puzzles and friendly tips.
          </p>
        </div>

        {/* Topics List */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {topics.map((topic) => {
            const isSelected = selectedTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => onTopicSelect(topic.id)}
                className={`group relative w-full overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 ease-out ${
                  isSelected
                    ? `bg-linear-to-br ${topic.gradient} text-white shadow-2xl border-transparent ring-2 ring-offset-2 ring-white/80`
                    : "bg-white/80 border-white/70 hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl"
                }`}
              >
                <div
                  className={`absolute -right-10 -top-14 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 ${
                    isSelected
                      ? "bg-white/40 opacity-80"
                      : "bg-sky-200/40 opacity-0 group-hover:opacity-70"
                  }`}
                />
                <div
                  className={`absolute -bottom-12 -left-10 h-28 w-28 rounded-full blur-3xl transition-opacity duration-300 ${
                    isSelected
                      ? "bg-white/30 opacity-80"
                      : "bg-orange-200/40 opacity-0 group-hover:opacity-70"
                  }`}
                />

                {/* Content */}
                <div className="relative flex items-start gap-3 p-4">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/50 text-2xl shadow-lg transition-transform duration-300 ${
                      isSelected ? "scale-110" : "group-hover:scale-105"
                    }`}
                  >
                    {topic.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h3
                      className={`text-base font-extrabold tracking-tight ${
                        isSelected ? "text-white drop-shadow-sm" : topic.color
                      }`}
                    >
                      {topic.name}
                    </h3>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        isSelected ? "text-white/85" : "text-slate-500"
                      }`}
                    >
                      {topic.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/80 text-lg text-yellow-500 shadow-md animate-pulse">
                      ✨
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Fun Footer */}
        <div className="mt-4 rounded-2xl border border-white/70 bg-linear-to-r from-blue-100/70 via-violet-100/80 to-pink-100/80 p-3 text-center shadow-inner backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-600">
            🌟 Tip: Pick a topic to unlock guided drawing magic! 🌟
          </p>
        </div>
      </div>
    </div>
  );
}
