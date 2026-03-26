import { useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { DPad } from "./DPad";
import "./App.css";

const VIDEO_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/video_feed`;

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
    <div className="app">
      <h1 className="title">uEye</h1>
      <h2 className="subtitle">The future of the internet is handmade</h2>
      <div className={`status-badge status-${status}`}>{status}</div>
      <img className="video-feed" src={VIDEO_URL} alt="Robot cam" />

      <div className="queue-ui">
        {role === "controller" && (
          <>
            <p className="queue-status">You&apos;re in control</p>
            {waitingCount > 0 && (
              <p className="queue-count">
                {waitingCount} {waitingCount === 1 ? "person" : "people"}{" "}
                waiting
              </p>
            )}
            <button className="queue-btn queue-btn-leave" onClick={leaveQueue}>
              Give Up Control
            </button>
          </>
        )}
        {role === "queued" && (
          <>
            <p className="queue-status">You&apos;re #{queuePosition} in line</p>
            <button className="queue-btn queue-btn-leave" onClick={leaveQueue}>
              Leave Queue
            </button>
          </>
        )}
        {role === "observer" && (
          <>
            <p className="queue-status">
              {queueLength > 0 ? "Someone is in control" : "Robot is idle"}
            </p>
            {queueLength > 0 && (
              <p className="queue-count">
                {waitingCount} {waitingCount === 1 ? "person" : "people"}{" "}
                waiting
              </p>
            )}
            <button className="queue-btn queue-btn-join" onClick={joinQueue}>
              Join Queue
            </button>
          </>
        )}
      </div>

      <p>Press and hold left or right to make the eye look in that direction</p>
      <DPad
        onCommand={handleCommand}
        disabled={role === "observer" || role === "queued"}
      />
      <div className="mirror-toggle">
        <span className="mirror-label">Confused? Should it be mirrored?</span>
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
        <div className="last-command">last: {lastCommand}</div>
      )}

      {idleCountdown !== null && (
        <div className="idle-overlay">
          <div className="idle-dialog">
            <p className="idle-title">Still there?</p>
            <p className="idle-countdown">Losing control in {idleCountdown}s</p>
            <div className="idle-actions">
              <button
                className="queue-btn queue-btn-join"
                onClick={keepControl}
              >
                Keep Control
              </button>
              <button
                className="queue-btn queue-btn-leave"
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
