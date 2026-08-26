import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Link2 } from 'lucide-react'
import { workspaceApi } from '@/api/endpoints/workspace'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { AxiosError } from 'axios'
import type { ApiError } from '@/types'

function nameToSlugPreview(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || ''
}

export default function CreateWorkspace() {
  const [name, setName] = useState('')
  const [slugPreview, setSlugPreview] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setSlugPreview(nameToSlugPreview(name))
  }, [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setLoading(true)
    try {
      const workspace = await workspaceApi.create(name.trim())
      navigate(`/${workspace.slug}`, { replace: true })
    } catch (err) {
      const ae = err as AxiosError<ApiError>
      setError(ae.response?.data?.detail ?? 'Failed to create workspace. Try again.')
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
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-3">
            <Building2 size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create your workspace</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 text-center">
            Your team will access it at a unique link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            label="Business or team name"
            placeholder="e.g. Felix Bakery"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            leftIcon={<Building2 size={16} />}
            required
            autoFocus
          />

          {/* Slug preview */}
          {slugPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-500/8 border border-brand-500/20"
            >
              <Link2 size={14} className="text-brand-500 flex-shrink-0" />
              <span className="text-xs text-[var(--text-secondary)]">
                Your link:{' '}
                <span className="font-semibold text-brand-500">
                  nexachat.app/{slugPreview}
                </span>
              </span>
            </motion.div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center" role="alert">{error}</p>
          )}

          <Button type="submit" loading={loading} fullWidth className="mt-1">
            Create workspace
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
