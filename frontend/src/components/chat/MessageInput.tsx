import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SendHorizonal, WifiOff } from 'lucide-react'
import type { ConnectionStatus } from '@/hooks/useWebSocket'

interface MessageInputProps {
  onSend: (content: string) => void
  onTypingStart: () => void
  onTypingStop: () => void
  connectionStatus: ConnectionStatus
  disabled?: boolean
}

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  connectionStatus,
  disabled = false,
}: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const isDisabled = disabled || connectionStatus === 'disconnected' || connectionStatus === 'reconnecting'

  // Auto-resize textarea
  const resize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])

  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTypingStart()
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        onTypingStop()
      }
    }, 2000)
  }, [onTypingStart, onTypingStop])

  const handleTypingStop = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      onTypingStop()
    }
  }, [onTypingStop])

  const handleSend = useCallback(() => {
    const content = value.trim()
    if (!content || isDisabled) return
    handleTypingStop()
    onSend(content)
    setValue('')
    textareaRef.current?.focus()
  }, [value, isDisabled, handleTypingStop, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const statusLabel =
    connectionStatus === 'reconnecting'
      ? 'Reconnecting…'
      : connectionStatus === 'disconnected'
      ? 'Disconnected'
      : null

  return (
    <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--surface)] safe-bottom">
      {/* Connection status banner */}
      {statusLabel && (
        <div className="flex items-center justify-center gap-2 py-1.5 bg-amber-500/10 border-b border-amber-500/20">
          <WifiOff size={12} className="text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">{statusLabel}</span>
        </div>
      )}

      <div className="flex items-end gap-2 p-3 sm:p-4">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { setValue(e.target.value); handleTypingStart() }}
            onKeyDown={handleKeyDown}
            onBlur={handleTypingStop}
            placeholder={isDisabled ? 'Reconnecting…' : 'Type a message…'}
            disabled={isDisabled}
            rows={1}
            aria-label="Message input"
            className={[
              'w-full resize-none rounded-2xl px-4 py-3 text-sm',
              'bg-[var(--surface-raised)] text-[var(--text-primary)]',
              'placeholder:text-[var(--text-muted)]',
              'border border-[var(--border)] focus:border-brand-500',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/30',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'leading-relaxed max-h-36 overflow-y-auto',
            ].join(' ')}
          />
        </div>

        {/* Send button */}
        <motion.button
          whileTap={isDisabled || !value.trim() ? undefined : { scale: 0.92 }}
          onClick={handleSend}
          disabled={isDisabled || !value.trim()}
          aria-label="Send message"
          className={[
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            'transition-all duration-150',
            isDisabled || !value.trim()
              ? 'bg-[var(--surface-raised)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-bubble',
          ].join(' ')}
        >
          <SendHorizonal size={18} />
        </motion.button>
      </div>
    </div>
  )
}
