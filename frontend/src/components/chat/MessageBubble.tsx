import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2, Check } from 'lucide-react'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function MessageBubble({ message, isOwn, onEdit, onDelete }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)

  const handleEditSubmit = () => {
    if (editValue.trim() && editValue.trim() !== message.content) {
      onEdit?.(message.id, editValue.trim())
    }
    setEditing(false)
  }

  const canEdit = isOwn && onEdit && !message.edited_at
  const canDelete = (isOwn || onDelete) && onDelete

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={['flex gap-2.5 group', isOwn ? 'flex-row-reverse' : 'flex-row'].join(' ')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar — only for others */}
      {!isOwn && (
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-auto mb-0.5"
          aria-hidden="true"
        >
          {message.sender_name[0]?.toUpperCase()}
        </div>
      )}

      <div className={['flex flex-col gap-0.5 max-w-[75%] sm:max-w-[65%]', isOwn ? 'items-end' : 'items-start'].join(' ')}>
        {/* Sender name — only for others */}
        {!isOwn && (
          <span className="text-xs font-medium text-[var(--text-muted)] px-1">
            {message.sender_name}
          </span>
        )}

        <div className={['flex items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row'].join(' ')}>
          {/* Bubble */}
          <div
            className={[
              'relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
              isOwn
                ? 'rounded-br-sm text-white'
                : 'rounded-bl-sm text-[var(--bubble-other-text)] bg-[var(--bubble-other)]',
            ].join(' ')}
            style={isOwn ? { background: 'var(--bubble-own)' } : undefined}
          >
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  className="bg-white/20 rounded-lg px-2 py-1 text-sm text-white placeholder:text-white/60 focus:outline-none flex-1 min-w-0"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSubmit()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  autoFocus
                  aria-label="Edit message"
                />
                <button
                  onClick={handleEditSubmit}
                  className="text-white/80 hover:text-white"
                  aria-label="Save edit"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <p>{message.content}</p>
            )}
          </div>

          {/* Action buttons — appear on hover */}
          {hovered && !editing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-0.5"
            >
              {canEdit && (
                <button
                  onClick={() => { setEditValue(message.content); setEditing(true) }}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-brand-500 hover:bg-[var(--surface-raised)] transition-colors"
                  aria-label="Edit message"
                >
                  <Pencil size={12} />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete?.(message.id)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  aria-label="Delete message"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Timestamp + edited badge */}
        <div className="flex items-center gap-1.5 px-1">
          <time
            className="text-[10px] text-[var(--text-muted)]"
            dateTime={message.timestamp}
            title={new Date(message.timestamp).toLocaleString()}
          >
            {formatTime(message.timestamp)}
          </time>
          {message.edited_at && (
            <span className="text-[10px] text-[var(--text-muted)] italic">edited</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Date separator between messages from different days
export function DateSeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 py-2 px-4" role="separator">
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-xs text-[var(--text-muted)] font-medium px-2">
        {formatDate(iso)}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}
