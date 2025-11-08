"use client";

import { useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "lucide-react";
import Button from "./Button";

type SessionStoppedProps = {
  startSession: () => void;
};

function SessionStopped({ startSession }: SessionStoppedProps) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-gray-600" : "bg-red-600"}
        icon={<CloudLightning size={16} />}
        disabled={isActivating}
      >
        {isActivating ? "starting session..." : "start session"}
      </Button>
    </div>
  );
}

type SessionActiveProps = {
  stopSession: () => void;
  sendTextMessage: (message: string) => void;
};

function SessionActive({ stopSession, sendTextMessage }: SessionActiveProps) {
  const [message, setMessage] = useState("");

  function handleSendClientEvent() {
    sendTextMessage(message);
    setMessage("");
  }

  return (
    <div className="flex items-center justify-center w-full h-full gap-3">
      <input
        onKeyDown={(e) => {
          if (e.key === "Enter" && message.trim()) {
            handleSendClientEvent();
          }
        }}
        type="text"
        placeholder="send a text message..."
        className="border border-gray-300 rounded-full px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-black"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        onClick={() => {
          if (message.trim()) {
            handleSendClientEvent();
          }
        }}
        icon={<MessageSquare size={16} />}
        className="bg-blue-500 hover:bg-blue-600"
        disabled={!message.trim()}
      >
        send text
      </Button>
      <Button
        onClick={stopSession}
        icon={<CloudOff size={16} />}
        className="bg-gray-700"
      >
        disconnect
      </Button>
    </div>
  );
}

type SessionControlsProps = {
  startSession: () => void;
  stopSession: () => void;
  sendTextMessage: (message: string) => void;
  isSessionActive: boolean;
};

export default function SessionControls({
  startSession,
  stopSession,
  sendTextMessage,
  isSessionActive,
}: SessionControlsProps) {
  return (
    <div className="flex gap-4 border-t-2 border-gray-200 h-full rounded-md pt-4">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          sendTextMessage={sendTextMessage}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}

