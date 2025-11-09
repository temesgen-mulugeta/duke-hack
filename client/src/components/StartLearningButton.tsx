"use client";

import { MathTopic } from "./TopicMenu";

interface StartLearningButtonProps {
  topic: MathTopic;
  isSessionActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function StartLearningButton({
  topic,
  isSessionActive,
  onStart,
  onStop,
}: StartLearningButtonProps) {
  const topicNames = {
    circle: "Circle",
    rectangle: "Rectangle",
    triangle: "Triangle",
  };

  const topicEmojis = {
    circle: "🔵",
    rectangle: "📐",
    triangle: "🔺",
  };

  const topicColors = {
    circle: "from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800",
    rectangle:
      "from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800",
    triangle: "from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800",
  };

  if (isSessionActive) {
    return (
      <button
        onClick={onStop}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
          px-6 py-3 rounded-full 
          bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800
          text-white text-base font-bold 
          shadow-xl hover:shadow-2xl
          transition-all duration-300 
          hover:scale-105
          animate-pulse
          border-3 border-white
          flex items-center gap-2"
      >
        <span className="text-xl">⏹️</span>
        <span>Stop Learning</span>
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
        px-8 py-4 rounded-full 
        bg-gradient-to-r ${topicColors[topic]}
        text-white text-lg font-bold 
        shadow-xl hover:shadow-2xl
        transition-all duration-300 
        hover:scale-105
        animate-bounce
        border-3 border-white
        flex items-center gap-3
        group
      `}
    >
      <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">
        {topicEmojis[topic]}
      </span>
      <span>Start Learning {topicNames[topic]}!</span>
      <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
        🚀
      </span>
    </button>
  );
}

