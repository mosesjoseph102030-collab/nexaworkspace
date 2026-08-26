import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Building2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { workspaceApi } from '@/api/endpoints/workspace'
import { authApi } from '@/api/endpoints/auth'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WorkspacePublic, ApiError } from '@/types'
import type { AxiosError } from 'axios'

/**
 * Join flow — never forces a redirect to /login.
 *
 * Flow A (already logged in):
 *   Enter display name → Request to join → redirect to /pending
 *
 * Flow B (not logged in):
 *   Step 1: Enter display name (and optionally email+password to create account)
 *   Step 2: Account created + membership requested in one shot → /pending
 *
 *   If they already have an account they can switch to "Sign in" mode.
 */

type AuthMode = 'register' | 'login'

export default function JoinRequest() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const setAuth = useAuthStore(s => s.setAuth)

  const [workspace, setWorkspace] = useState<WorkspacePublic | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('register')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slug) return
    workspaceApi.getBySlug(slug)
      .then(setWorkspace)
      .catch(() => setNotFound(true))
      .finally(() => setWorkspaceLoading(false))
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !displayName.trim()) return
    setError('')
    setLoading(true)

    try {
      // Step 1: auth if not already logged in
      if (!isAuthenticated) {
        if (authMode === 'register') {
          if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields to create your account.')
            setLoading(false)
            return
          }
          const data = await authApi.register({
            email,
            password,
            full_name: displayName.trim(),
          })
          setAuth(data.user, data.access_token)
        } else {
          // login mode
          if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.')
            setLoading(false)
            return
          }
          const data = await authApi.login({ email, password })
          setAuth(data.user, data.access_token)
        }
      }

      // Step 2: request membership
      await workspaceApi.requestMembership(slug, displayName.trim())
      navigate(`/${slug}/pending`)
    } catch (err) {
      const ae = err as AxiosError<ApiError>
      const code = ae.response?.data?.code
      if (code === 'DUPLICATE_MEMBERSHIP') {
        navigate(`/${slug}/pending`)
      } else if (code === 'USER_EXISTS') {
        setAuthMode('login')
        setError('An account with this email already exists. Sign in below.')
      } else {
        setError(ae.response?.data?.detail ?? 'Something went wrong. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-11 w-full rounded-xl mt-6" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Workspace not found</h2>
          <p className="text-[var(--text-muted)] mt-2 text-sm">Double-check the link and try again.</p>
          <Button variant="ghost" className="mt-6" onClick={() => navigate('/')}>Go home</Button>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Workspace header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-3 shadow-bubble">
            <Building2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Join {workspace?.name}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Managed by {workspace?.owner_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Display name — always shown */}
          <Input
            type="text"
            label="Your name in chat"
            placeholder="How should your team know you?"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setError('') }}
            leftIcon={<User size={16} />}
            hint="This is what others will see"
            required
            autoFocus
          />

          {/* Auth fields — only shown when not logged in */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  {authMode === 'register' ? 'Create your account' : 'Sign in to your account'}
                </span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                leftIcon={<Mail size={16} />}
                required
                autoComplete={authMode === 'register' ? 'email' : 'username'}
              />

              <Input
                type={showPwd ? 'text' : 'password'}
                label="Password"
                placeholder={authMode === 'register' ? 'Min. 8 characters' : '••••••••'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                leftIcon={<Lock size={16} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />

              {/* Switch auth mode */}
              <button
                type="button"
                onClick={() => { setAuthMode(m => m === 'register' ? 'login' : 'register'); setError('') }}
                className="text-xs text-brand-500 hover:underline text-left"
              >
                {authMode === 'register'
                  ? 'Already have an account? Sign in instead'
                  : "Don't have an account? Create one"}
              </button>
            </motion.div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center" role="alert">{error}</p>
          )}

          <Button type="submit" loading={loading} fullWidth>
            {isAuthenticated
              ? 'Request to join'
              : authMode === 'register'
              ? 'Create account & request to join'
              : 'Sign in & request to join'}
          </Button>
        </form>

        {isAuthenticated && (
          <p className="text-xs text-center text-[var(--text-muted)] mt-4">
            Signed in as a different person?{' '}
            <button
              onClick={() => { useAuthStore.getState().clearAuth(); window.location.reload() }}
              className="text-brand-500 hover:underline"
            >
              Sign out
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}
