import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'
const WS_TOKEN = import.meta.env.VITE_WS_TOKEN

function buildWsUrl() {
  return WS_TOKEN ? `${WS_URL}?token=${WS_TOKEN}` : WS_URL
}

export function useWebSocket() {
  const wsRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [sessionState, setSessionState] = useState({
    clientId: null,
    role: 'connecting',
    queuePosition: null,
    queueLength: 0,
    idleCountdown: null,
  })

  useEffect(() => {
    let cancelled = false

    function connect() {
      if (cancelled) return
      setStatus('connecting')
      setSessionState(s => ({ ...s, role: 'connecting', idleCountdown: null }))
      const ws = new WebSocket(buildWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        if (!cancelled) setStatus('open')
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        let data
        try { data = JSON.parse(event.data) } catch { return }

        switch (data.type) {
          case 'session_assigned':
            setSessionState(s => ({ ...s, clientId: data.client_id }))
            break
          case 'role_update':
            setSessionState(s => ({
              ...s,
              role: data.role,
              queuePosition: data.queue_position,
              queueLength: data.queue_length,
              idleCountdown: data.role !== 'controller' ? null : s.idleCountdown,
            }))
            break
          case 'queue_state':
            setSessionState(s => ({ ...s, queueLength: data.queue_length }))
            break
          case 'idle_warning':
            setSessionState(s => ({ ...s, idleCountdown: data.countdown_seconds }))
            break
          case 'control_lost':
            setSessionState(s => ({
              ...s,
              role: 'observer',
              queuePosition: null,
              idleCountdown: null,
            }))
            break
        }
      }

      ws.onclose = () => {
        if (cancelled) return
        setStatus('closed')
        setSessionState(s => ({ ...s, role: 'connecting', idleCountdown: null }))
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

  const joinQueue = useCallback(() => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'join_queue' }))
    }
  }, [])

  const leaveQueue = useCallback(() => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave_queue' }))
    }
  }, [])

  const keepControl = useCallback(() => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'keep_alive' }))
      setSessionState(s => ({ ...s, idleCountdown: null }))
    }
  }, [])

  return { sendDirection, status, sessionState, joinQueue, leaveQueue, keepControl }
}
