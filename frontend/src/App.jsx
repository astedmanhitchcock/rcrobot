import { useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { DPad } from "./DPad";
import "./App.css";

const VIDEO_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/video_feed`;

const statusBadgeClass = {
  open: "bg-[#1a4d2e] text-[#4ade80]",
  closed: "bg-[#4d1a1a] text-[#f87171]",
  connecting: "bg-[#4d3a1a] text-[#fbbf24]",
};

const btnBase =
  "text-xs font-semibold uppercase tracking-[0.08em] px-5 py-2 rounded-full border-0 cursor-pointer transition-opacity active:opacity-70 mt-1";

export default function App() {
  const {
    sendDirection,
    status,
    sessionState,
    joinQueue,
    leaveQueue,
    keepControl,
  } = useWebSocket();
  const [lastCommand, setLastCommand] = useState(null);
  const [mirrored, setMirrored] = useState(false);
  const { role, queuePosition, queueLength, idleCountdown } = sessionState;

  function handleCommand(direction) {
    let cmd = direction;
    if (mirrored && direction === "left") cmd = "right";
    else if (mirrored && direction === "right") cmd = "left";
    sendDirection(cmd);
    setLastCommand(cmd);
  }

  const waitingCount = Math.max(0, queueLength - 1);

  return (
    <div className="flex flex-col items-center justify-center gap-2 h-dvh p-6">
      <h1 className="text-2xl font-semibold tracking-wider">uEye</h1>
      <h2 className="text-sm text-[#888] tracking-wider">
        The future of the internet is handmade
      </h2>
      <div
        className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${statusBadgeClass[status] ?? "bg-[#333]"}`}
      >
        {status}
      </div>
      <img
        className="w-full max-w-[480px] rounded-xl border-2 border-[#333] bg-black aspect-[4/3] object-cover"
        src={VIDEO_URL}
        alt="Robot cam"
      />

      <div className="flex flex-col items-center gap-1.5">
        {role === "controller" && (
          <>
            <p className="text-sm font-semibold">You&apos;re in control</p>
            {waitingCount > 0 && (
              <p className="text-xs text-[#888]">
                {waitingCount} {waitingCount === 1 ? "person" : "people"} waiting
              </p>
            )}
            <button
              className={`${btnBase} bg-[#4d1a1a] text-[#f87171]`}
              onClick={leaveQueue}
            >
              Give Up Control
            </button>
          </>
        )}
        {role === "queued" && (
          <>
            <p className="text-sm font-semibold">
              You&apos;re #{queuePosition} in line
            </p>
            <button
              className={`${btnBase} bg-[#4d1a1a] text-[#f87171]`}
              onClick={leaveQueue}
            >
              Leave Queue
            </button>
          </>
        )}
        {role === "observer" && (
          <>
            <p className="text-sm font-semibold">
              {queueLength > 0 ? "Someone is in control" : "Robot is idle"}
            </p>
            {queueLength > 0 && (
              <p className="text-xs text-[#888]">
                {waitingCount} {waitingCount === 1 ? "person" : "people"} waiting
              </p>
            )}
            <button
              className={`${btnBase} bg-[#1a4d2e] text-[#4ade80]`}
              onClick={joinQueue}
            >
              Join Queue
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-[#888]">
        Press and hold left or right to make the eye look in that direction
      </p>
      <DPad
        onCommand={handleCommand}
        disabled={role === "observer" || role === "queued"}
      />
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-[#888]">
          Confused? Should it be mirrored?
        </span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={mirrored}
            onChange={e => setMirrored(e.target.checked)}
          />
          <span className="toggle-track" />
        </label>
      </div>
      {lastCommand && role === "controller" && (
        <div className="text-xs text-[#888] tracking-wider">
          last: {lastCommand}
        </div>
      )}

      {idleCountdown !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border-2 border-[#444] rounded-2xl px-10 py-8 flex flex-col items-center gap-3 max-w-xs text-center">
            <p className="text-xl font-semibold">Still there?</p>
            <p className="text-sm text-[#fbbf24]">
              Losing control in {idleCountdown}s
            </p>
            <div className="flex gap-3 mt-2">
              <button
                className={`${btnBase} bg-[#1a4d2e] text-[#4ade80]`}
                onClick={keepControl}
              >
                Keep Control
              </button>
              <button
                className={`${btnBase} bg-[#4d1a1a] text-[#f87171]`}
                onClick={leaveQueue}
              >
                Give Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
