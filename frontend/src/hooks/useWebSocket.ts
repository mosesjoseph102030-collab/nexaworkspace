import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { WsEvent } from '@/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

interface UseWebSocketOptions {
  slug: string
  onEvent: (event: WsEvent) => void
  enabled?: boolean
}

const BASE_WS_URL = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000]

export function useWebSocket({ slug, onEvent, enabled = true }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const wsUrl = `${BASE_WS_URL}/ws/chat/${slug}?token=${encodeURIComponent(token)}`
    setStatus(retryCountRef.current > 0 ? 'reconnecting' : 'connecting')

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      retryCountRef.current = 0
      setStatus('connected')
    }

    ws.onmessage = (ev) => {
      if (!mountedRef.current) return
      try {
        const event = JSON.parse(ev.data) as WsEvent
        onEventRef.current(event)
      } catch { /* malformed event — ignore */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus('disconnected')
      wsRef.current = null

      if (!enabled) return
      const delay = BACKOFF_DELAYS[Math.min(retryCountRef.current, BACKOFF_DELAYS.length - 1)]
      retryCountRef.current++
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [slug, enabled])

  const sendEvent = useCallback((event: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (enabled) connect()
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [connect, disconnect, enabled])

  // Heartbeat ping every 25s to keep connection alive through proxies
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => sendEvent({ type: 'ping' }), 25_000)
    return () => clearInterval(id)
  }, [status, sendEvent])

  return { status, sendEvent, disconnect }
}
