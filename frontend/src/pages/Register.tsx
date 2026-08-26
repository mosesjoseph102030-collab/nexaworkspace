import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/endpoints/auth'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { AxiosError } from 'axios'
import type { ApiError } from '@/types'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register({ email, password, full_name: fullName })
      setAuth(data.user, data.access_token)
      navigate('/create-workspace', { replace: true })
    } catch (err) {
      const ae = err as AxiosError<ApiError>
      setError(ae.response?.data?.detail ?? 'Registration failed. Please try again.')
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create account</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Start your free workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            label="Full name"
            placeholder="Felix Mensah"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            leftIcon={<User size={16} />}
            required
            autoComplete="name"
          />
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
            placeholder="Min. 8 characters"
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
            hint="At least 8 characters"
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-red-500 text-center" role="alert">{error}</p>
          )}

          <Button type="submit" loading={loading} fullWidth className="mt-1">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-500 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
