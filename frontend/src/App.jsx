import { useState } from 'react'
import { useWebSocket } from './useWebSocket'
import { DPad } from './DPad'
import './App.css'

const VIDEO_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/video_feed`

export default function App() {
  const { sendDirection, status } = useWebSocket()
  const [lastCommand, setLastCommand] = useState(null)

  function handleCommand(direction) {
    sendDirection(direction)
    setLastCommand(direction)
  }

  return (
    <div className="app">
      <h1 className="title">RC Robot</h1>
      <div className={`status-badge status-${status}`}>{status}</div>
      <img className="video-feed" src={VIDEO_URL} alt="Robot cam" />
      <DPad onCommand={handleCommand} />
      {lastCommand && (
        <div className="last-command">last: {lastCommand}</div>
      )}
    </div>
  )
}
