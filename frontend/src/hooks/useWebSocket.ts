import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/endpoints/auth'
import type { WsEvent } from '@/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

interface UseWebSocketOptions {
  slug: string
  onEvent: (event: WsEvent) => void
  enabled?: boolean
}

console.log("API URL:", import.meta.env.VITE_API_URL);
console.log("WS URL:", import.meta.env.VITE_WS_URL);

/**
 * Derive the WS base URL.
 * VITE_WS_URL must be set in production (e.g. wss://your-backend.onrender.com).
 * Fallback derives from VITE_API_URL so we never accidentally point at the
 * Vercel frontend domain when the explicit env var is missing.
 */
function getWsBaseUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL as string
  }
  // Derive from the API URL (strips http/https, replaces with ws/wss)
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  if (apiUrl) {
    return apiUrl.replace(/^http/, 'ws')
  }
  // Last-resort fallback: same host (only correct when frontend and backend are co-hosted)
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
}

const BASE_WS_URL = getWsBaseUrl()
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000]

export function useWebSocket({ slug, onEvent, enabled = true }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  /** Schedule the next reconnect attempt with exponential back-off. */
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    const delay = BACKOFF_DELAYS[Math.min(retryCountRef.current, BACKOFF_DELAYS.length - 1)]
    retryCountRef.current++
    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect() // eslint-disable-line @typescript-eslint/no-use-before-define
    }, delay)
  }, [enabled]) // connect added via closure below

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    const token = useAuthStore.getState().accessToken
    if (!token) return // still no token — will be called again once token is ready

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

    ws.onclose = (ev) => {
      if (!mountedRef.current) return
      setStatus('disconnected')
      wsRef.current = null

      if (!enabled) return

      if (ev.code === 4001) {
        // JWT expired — refresh the token first, then reconnect
        authApi.refreshToken()
          .then(({ access_token }) => {
            useAuthStore.getState().setAccessToken(access_token)
            if (mountedRef.current) scheduleReconnect()
          })
          .catch(() => {
            // Refresh token itself expired — send user back to login
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          })
        return
      }

      scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [slug, enabled, scheduleReconnect])

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

  // Heartbeat ping every 25s to keep connection alive through proxies / Render's load balancer
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => sendEvent({ type: 'ping' }), 25_000)
    return () => clearInterval(id)
  }, [status, sendEvent])

  return { status, sendEvent, disconnect }
}
