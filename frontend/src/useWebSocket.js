import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:5173/ws'

export function useWebSocket() {
  const wsRef = useRef(null)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    let cancelled = false

    function connect() {
      if (cancelled) return
      setStatus('connecting')
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!cancelled) setStatus('open')
      }

      ws.onclose = () => {
        if (cancelled) return
        setStatus('closed')
        setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [])

  const sendDirection = useCallback((direction) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ direction }))
    }
  }, [])

  return { sendDirection, status }
}
