import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pin, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { Announcement } from '@/types'
import { announcementsApi } from '@/api/endpoints/announcements'
import { useToast } from '@/components/ui/Toast'

interface AnnouncementBannerProps {
  slug: string
  announcement: Announcement | null
  isOwner: boolean
  onAnnouncementChange: (ann: Announcement | null) => void
}

const EMOJIS = ['📌', '🔔', '⚠️', '🎉', '📢', '🕐', '✅', '🚨']

export function AnnouncementBanner({
  slug,
  announcement,
  isOwner,
  onAnnouncementChange,
}: AnnouncementBannerProps) {
  const [composing, setComposing] = useState(false)
  const [content, setContent] = useState('')
  const [emoji, setEmoji] = useState('📌')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { success: toastSuccess, error: toastError } = useToast()

  const handlePin = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      const ann = await announcementsApi.pin(slug, content.trim(), emoji)
      onAnnouncementChange(ann)
      setComposing(false)
      setContent('')
      setEmoji('📌')
      toastSuccess('Announcement pinned')
    } catch {
      toastError('Failed to pin announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleUnpin = async () => {
    setLoading(true)
    try {
      await announcementsApi.unpin(slug)
      onAnnouncementChange(null)
      toastSuccess('Announcement removed')
    } catch {
      toastError('Failed to remove announcement')
    } finally {
      setLoading(false)
    }
  }

  // Owner: show compose form if no active announcement
  if (isOwner && !announcement && !composing) {
    return (
      <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--border)]">
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-brand-500 transition-colors"
        >
          <Pin size={12} />
          Pin an announcement
        </button>
      </div>
    )
  }

  // Compose form
  if (isOwner && composing) {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface-raised)]"
      >
        <div className="px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Pin size={13} className="text-brand-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              New announcement
            </span>
            <button
              onClick={() => setComposing(false)}
              className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Emoji picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={[
                  'w-7 h-7 rounded-lg text-sm transition-all',
                  emoji === e
                    ? 'bg-brand-500/20 ring-1 ring-brand-500'
                    : 'hover:bg-[var(--surface-overlay)]',
                ].join(' ')}
                aria-label={`Use ${e} emoji`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your announcement… (e.g. Shop opens at 9am tomorrow)"
              rows={2}
              maxLength={500}
              className="flex-1 resize-none text-xs px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 leading-relaxed"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePin()
              }}
            />
            <button
              onClick={handlePin}
              disabled={loading || !content.trim()}
              className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {loading ? (
                <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                'Pin'
              )}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {content.length}/500 · Ctrl+Enter to pin
          </p>
        </div>
      </motion.div>
    )
  }

  // Active announcement banner
  if (!announcement) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="flex-shrink-0 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-brand-500/5"
      >
        <div className="flex items-start gap-2.5 px-4 py-2.5">
          {/* Emoji + pin icon */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <span className="text-base leading-none" aria-hidden="true">
              {announcement.emoji}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Pin size={10} className="text-amber-500 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                Announcement
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                · {announcement.author_name}
              </span>
            </div>
            <p
              className={[
                'text-xs text-[var(--text-primary)] leading-relaxed',
                collapsed ? 'line-clamp-1' : '',
              ].join(' ')}
            >
              {announcement.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            {announcement.content.length > 80 && (
              <button
                onClick={() => setCollapsed(v => !v)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
                aria-label={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
              </button>
            )}
            {isOwner && (
              <>
                <button
                  onClick={() => {
                    setContent(announcement.content)
                    setEmoji(announcement.emoji)
                    handleUnpin().then(() => setComposing(true))
                  }}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                  aria-label="Edit announcement"
                  title="Edit"
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={handleUnpin}
                  disabled={loading}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  aria-label="Remove announcement"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
