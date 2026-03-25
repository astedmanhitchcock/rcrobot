import { useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { DPad } from "./DPad";
import "./App.css";

const VIDEO_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/video_feed`;

export default function App() {
  const { sendDirection, status } = useWebSocket();
  const [lastCommand, setLastCommand] = useState(null);

  function handleCommand(direction) {
    sendDirection(direction);
    setLastCommand(direction);
  }

  return (
    <div className="app">
      <h1 className="title">uEye</h1>
      <h2 className="subtitle">The future of the internet is handmade</h2>
      <div className={`status-badge status-${status}`}>{status}</div>
      <img className="video-feed" src={VIDEO_URL} alt="Robot cam" />
      <p>Press and hold left or right to make the eye look in that direction</p>
      <DPad onCommand={handleCommand} />
      {lastCommand && <div className="last-command">last: {lastCommand}</div>}
    </div>
  );
}
