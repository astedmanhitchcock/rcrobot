import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:5173/ws'

export function useWebSocket() {
  const wsRef = useRef(null)
  const isMounted = useRef(true)
  const [status, setStatus] = useState('connecting')

  const connect = useCallback(() => {
    if (!isMounted.current) return

    setStatus('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (isMounted.current) setStatus('open')
    }

    ws.onerror = () => {
      // onerror is always followed by onclose; handle reconnect there
    }

    ws.onclose = () => {
      if (!isMounted.current) return
      setStatus('closed')
      setTimeout(connect, 2000)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    connect()

    return () => {
      isMounted.current = false
      wsRef.current?.close()
    }
  }, [connect])

  const sendDirection = useCallback((direction) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ direction }))
    }
  }, [])

  return { sendDirection, status }
}
