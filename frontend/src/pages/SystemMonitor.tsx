import { useEffect, useState, useCallback } from 'react'
import { Database, Radio, Sparkles, RefreshCw, Moon, Sun, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { useNavigate } from 'react-router-dom'

interface ServiceStatus {
  status: string
  error?: string
  provider?: string
}

interface HealthData {
  status: string
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    ai: ServiceStatus
  }
}

interface StatsData {
  total_users: number
  active_workspaces: number
  total_messages: number
}

const statusStyles: Record<string, { card: string; dot: string; label: string }> = {
  healthy:        { card: 'border-emerald-500/30 bg-emerald-500/8',  dot: 'bg-emerald-500',                    label: 'text-emerald-500' },
  degraded:       { card: 'border-amber-500/30 bg-amber-500/8',      dot: 'bg-amber-500',                      label: 'text-amber-500' },
  unhealthy:      { card: 'border-red-500/30 bg-red-500/8',          dot: 'bg-red-500',                        label: 'text-red-500' },
  not_configured: { card: 'border-[var(--border)] bg-[var(--surface-raised)]', dot: 'bg-[var(--text-muted)]', label: 'text-[var(--text-muted)]' },
}

function getStyle(status: string) {
  return statusStyles[status] ?? statusStyles.not_configured
}

function ServiceCard({ name, icon: Icon, status }: { name: string; icon: LucideIcon; status: ServiceStatus }) {
  const s = getStyle(status.status)
  return (
    <div className={`flex items-center gap-3 p-4 rounded-2xl border ${s.card}`}>
      <div className="w-9 h-9 rounded-xl bg-white/10 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className={s.label} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
        </div>
        <p className={`text-xs mt-0.5 capitalize ${s.label}`}>
          {status.status.replace(/_/g, ' ')}
          {status.provider ? ` · ${status.provider}` : ''}
          {status.error ? ` · ${status.error}` : ''}
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-brand-500" />
      </div>
      <div>
        <p className="text-xl font-black text-[var(--text-primary)]">{value.toLocaleString()}</p>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
      </div>
    </div>
  )
}

const API_BASE = 'http://localhost:8000'

export default function SystemMonitor() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      // Use plain fetch — no auth headers needed
      const [hRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/system-monitor/health`),
        fetch(`${API_BASE}/system-monitor/stats`),
      ])
      if (!hRes.ok || !sRes.ok) {
        setError('Backend unreachable. Is uvicorn running?')
        return
      }
      const [h, s] = await Promise.all([hRes.json(), sRes.json()])
      setHealth(h)
      setStats(s)
      setLastUpdated(new Date())
    } catch {
      setError('Cannot connect to backend. Make sure uvicorn is running on port 8000.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 10_000)
    return () => clearInterval(id)
  }, [fetchAll])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">

      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-4 sm:px-8 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <span className="font-bold text-[var(--text-primary)] text-sm">NEXACHAT</span>
          <span className="text-[10px] text-[var(--text-muted)] ml-1 hidden sm:inline">· System Monitor</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => navigate('/')} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1">
            ← Home
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">System Health</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Fetching…'}
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Overall status pill */}
        {health && !error && (
          <div className={`p-3 rounded-xl border text-center text-sm font-semibold ${getStyle(health.status).card} ${getStyle(health.status).label}`}>
            System is {health.status}
          </div>
        )}

        {/* Services */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Services</p>
          {health ? (
            <div className="grid gap-3">
              <ServiceCard name="Database" icon={Database} status={health.services.database} />
              <ServiceCard name="Redis / WebSocket" icon={Radio} status={health.services.redis} />
              <ServiceCard name="AI Service" icon={Sparkles} status={health.services.ai} />
            </div>
          ) : !error ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse" />
              ))}
            </div>
          ) : null}
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Statistics</p>
          {stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="Total users" value={stats.total_users} icon={Activity} />
              <StatCard label="Active workspaces" value={stats.active_workspaces} icon={Activity} />
              <StatCard label="Total messages" value={stats.total_messages} icon={Activity} />
            </div>
          ) : !error ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse" />
              ))}
            </div>
          ) : null}
        </div>

        {/* Direct links */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Direct Endpoints</p>
          <div className="space-y-2">
            {[
              { label: 'API Documentation', url: 'http://localhost:8000/api/docs' },
              { label: 'Health JSON', url: 'http://localhost:8000/system-monitor/health' },
              { label: 'Stats JSON', url: 'http://localhost:8000/system-monitor/stats' },
            ].map(({ label, url }) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] hover:border-brand-500/30 transition-colors group"
              >
                <span className="text-sm text-[var(--text-primary)]">{label}</span>
                <span className="text-xs text-brand-500 font-mono opacity-60 group-hover:opacity-100 transition-opacity truncate max-w-[200px]">{url}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
