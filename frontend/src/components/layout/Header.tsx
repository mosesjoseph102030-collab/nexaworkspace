import { Moon, Sun, Menu, Sparkles, LogOut } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/endpoints/auth'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  workspaceName?: string
  onMobileMenuToggle?: () => void
  onSummarise?: () => void
  showChatActions?: boolean
}

export function Header({
  workspaceName,
  onMobileMenuToggle,
  onSummarise,
  showChatActions = false,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
      {/* Left: mobile menu + workspace name */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors sm:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">N</span>
          </div>
          <span className="font-bold text-[var(--text-primary)] text-sm hidden sm:block">
            {workspaceName ?? 'NEXACHAT'}
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {showChatActions && onSummarise && (
          <button
            onClick={onSummarise}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-500 hover:bg-brand-500/10 transition-colors"
            aria-label="Summarise conversation"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Summarise</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
