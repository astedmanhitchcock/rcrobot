import { useState } from 'react'
import { useWebSocket } from './useWebSocket'
import { DPad } from './DPad'
import './App.css'

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
      <DPad onCommand={handleCommand} />
      {lastCommand && (
        <div className="last-command">last: {lastCommand}</div>
      )}
    </div>
  )
}
