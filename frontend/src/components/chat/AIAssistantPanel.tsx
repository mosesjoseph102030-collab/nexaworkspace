import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Sparkles, BookOpen, Loader2, ChevronRight } from 'lucide-react'
import { aiApi } from '@/api/endpoints/ai'

interface AIAssistantPanelProps {
  slug: string
  lastMessageId: string | null
  lastMessageSenderId: string
  currentUserId: string
  onSelectReply: (text: string) => void
}

type PanelState = 'idle' | 'summary' | 'replies'

export function AIAssistantPanel({
  slug,
  lastMessageId,
  lastMessageSenderId,
  currentUserId,
  onSelectReply,
}: AIAssistantPanelProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<PanelState>('idle')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{
    summary: string; message_count: number; from_ts: string | null; to_ts: string | null
  } | null>(null)
  const [replies, setReplies] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleSummary = async () => {
    setState('summary')
    setLoading(true)
    setError('')
    try {
      const data = await aiApi.summary(slug, 50)
      setSummary(data)
    } catch {
      setError('AI service unavailable. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  const handleSmartReplies = async () => {
    if (!lastMessageId) return
    setState('replies')
    setLoading(true)
    setError('')
    try {
      const data = await aiApi.smartReplies(slug, lastMessageId)
      setReplies(data.suggestions)
    } catch {
      setError('Could not generate replies.')
    } finally {
      setLoading(false)
    }
  }

  const canSmartReply = lastMessageId && lastMessageSenderId !== currentUserId

  return (
    <>
      {/* Floating AI button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(v => !v); setState('idle') }}
        className={[
          'fixed bottom-24 right-4 z-30 w-12 h-12 rounded-2xl shadow-lg',
          'flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-[var(--surface)] border-2 border-brand-500 text-brand-500'
            : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-bubble',
        ].join(' ')}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
              <Bot size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={[
              'fixed bottom-40 right-4 z-30 w-72 rounded-2xl',
              'bg-[var(--surface)] border border-[var(--border)]',
              'shadow-glass dark:shadow-glass-dark overflow-hidden',
            ].join(' ')}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-brand-500/10 to-transparent">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
                <Bot size={13} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">AI Assistant</span>
              <span className="ml-auto text-xs text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-full">
                NEXA AI
              </span>
            </div>

            {/* Panel content */}
            <div className="p-3 space-y-2">
              {/* Idle state — action buttons */}
              {state === 'idle' && (
                <>
                  <button
                    onClick={handleSummary}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-raised)] transition-colors group text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                      <BookOpen size={15} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Summarise chat</p>
                      <p className="text-xs text-[var(--text-muted)]">Get a quick digest of the conversation</p>
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                  </button>

                  {canSmartReply && (
                    <button
                      onClick={handleSmartReplies}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-raised)] transition-colors group text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                        <Sparkles size={15} className="text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Smart replies</p>
                        <p className="text-xs text-[var(--text-muted)]">AI-suggested replies to last message</p>
                      </div>
                      <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </button>
                  )}

                  {!canSmartReply && (
                    <div className="flex items-center gap-3 p-3 rounded-xl opacity-40">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-overlay)] flex items-center justify-center flex-shrink-0">
                        <Sparkles size={15} className="text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Smart replies</p>
                        <p className="text-xs text-[var(--text-muted)]">Available after someone messages you</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Loading */}
              {loading && (
                <div className="py-6 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                    <Loader2 size={18} className="text-brand-500 animate-spin" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {state === 'summary' ? 'Summarising conversation…' : 'Generating replies…'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-500">{error}</p>
                  <button
                    onClick={() => { setState('idle'); setError('') }}
                    className="text-xs text-red-500 hover:underline mt-1"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Summary result */}
              {state === 'summary' && !loading && !error && summary && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">{summary.summary}</p>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-muted)]">{summary.message_count} messages</span>
                      {summary.from_ts && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {new Date(summary.from_ts).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setState('idle'); setSummary(null) }}
                    className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Smart reply chips */}
              {state === 'replies' && !loading && !error && replies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)] px-1">Tap a reply to use it:</p>
                  <div className="space-y-1.5">
                    {replies.map((r, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => { onSelectReply(r); setOpen(false) }}
                        className={[
                          'w-full text-left px-3 py-2.5 rounded-xl text-sm',
                          'bg-[var(--surface-raised)] hover:bg-brand-500/10',
                          'text-[var(--text-primary)] hover:text-brand-600 dark:hover:text-brand-400',
                          'border border-[var(--border)] hover:border-brand-500/30',
                          'transition-all duration-150',
                        ].join(' ')}
                      >
                        {r}
                      </motion.button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setState('idle'); setReplies([]) }}
                    className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {state === 'replies' && !loading && !error && replies.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-xs text-[var(--text-muted)]">No suggestions available</p>
                  <button onClick={() => setState('idle')} className="text-xs text-brand-500 hover:underline mt-1">
                    ← Back
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
