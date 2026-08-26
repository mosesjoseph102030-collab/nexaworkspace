import React, { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-500" />,
  error: <XCircle size={16} className="text-red-500" />,
  warning: <AlertCircle size={16} className="text-amber-500" />,
  info: <Info size={16} className="text-blue-500" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error = useCallback((msg: string) => toast(msg, 'error'), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role="alert"
              className={[
                'flex items-start gap-3 p-3.5 rounded-xl border',
                'bg-[var(--surface)] shadow-glass dark:shadow-glass-dark',
                bgColors[t.type],
              ].join(' ')}
            >
              <span className="flex-shrink-0 mt-0.5">{icons[t.type]}</span>
              <p className="text-sm text-[var(--text-primary)] flex-1 leading-snug">
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
