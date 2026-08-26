import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { workspaceApi } from '@/api/endpoints/workspace'
import { Button } from '@/components/ui/Button'

type Status = 'pending' | 'approved' | 'declined'

export default function PendingApproval() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const token = useAuthStore(s => s.accessToken)
  const [status, setStatus] = useState<Status>('pending')
  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollStatus = useCallback(async () => {
    if (!slug) return
    try {
      const res = await workspaceApi.getMembershipStatus(slug)
      if (res.status === 'approved' || res.status === 'owner') {
        setStatus('approved')
      }
    } catch { /* ignore */ }
  }, [slug])

  useEffect(() => {
    if (!slug || !token) return

    const wsBase = import.meta.env.VITE_WS_URL ||
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    const ws = new WebSocket(`${wsBase}/ws/notify?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data)
        if (event.type === 'approved' && event.workspace_slug === slug) {
          setStatus('approved')
        }
        if (event.type === 'declined' && event.workspace_slug === slug) {
          setStatus('declined')
        }
      } catch { /* ignore */ }
    }

    // Fallback poll
    pollRef.current = setInterval(pollStatus, 10_000)
    pollStatus() // immediate check

    return () => {
      ws.close()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [slug, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate when approved
  useEffect(() => {
    if (status === 'approved' && slug) {
      setTimeout(() => navigate(`/${slug}`, { replace: true }), 1500)
    }
  }, [status, slug, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm text-center"
      >
        {status === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Request sent!
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Your request to join has been sent to the owner.
              This page will update automatically when they respond.
            </p>
            <div className="flex justify-center mt-6">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {status === 'approved' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">You're in!</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Your request was approved. Taking you to the chat…
            </p>
          </>
        )}

        {status === 'declined' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Request declined</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              The owner declined your request to join this workspace.
            </p>
            <Button variant="ghost" className="mt-6" onClick={() => navigate('/')}>
              Go home
            </Button>
          </>
        )}
      </motion.div>
    </div>
  )
}
