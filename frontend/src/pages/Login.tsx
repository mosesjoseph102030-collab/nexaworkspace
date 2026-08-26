import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/endpoints/auth'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { AxiosError } from 'axios'
import type { ApiError } from '@/types'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') ?? '/create-workspace'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      setAuth(data.user, data.access_token)

      // Smart redirect: check if user owns or belongs to a workspace
      try {
        const { apiClient } = await import('@/api/client')

        // Check if user owns any workspace
        const wsResp = await apiClient.get('/api/auth/my-workspaces').catch(() => null)
        if (wsResp?.data?.owned?.[0]) {
          navigate(`/${wsResp.data.owned[0].slug}`, { replace: true })
          return
        }
        // Check if user is a member of any workspace
        if (wsResp?.data?.member_of?.[0]) {
          navigate(`/${wsResp.data.member_of[0].slug}`, { replace: true })
          return
        }
      } catch { /* ignore — fall through to redirect param */ }

      navigate(redirect, { replace: true })
    } catch (err) {
      const ae = err as AxiosError<ApiError>
      setError(ae.response?.data?.detail ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-3">
            <span className="text-white font-black text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
          />
          <Input
            type={showPwd ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-500 text-center" role="alert">{error}</p>
          )}

          <Button type="submit" loading={loading} fullWidth className="mt-1">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-500 hover:underline font-medium">
            Create one
          </Link>
        </p>
        <p className="text-center text-sm text-[var(--text-muted)] mt-2">
          <Link to="/" className="text-[var(--text-muted)] hover:text-brand-500 transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
