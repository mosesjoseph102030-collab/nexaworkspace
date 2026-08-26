import { useEffect, useRef, useCallback } from 'react'
import { MessageBubble, DateSeparator } from '@/components/chat/MessageBubble'
import { MessageSkeleton } from '@/components/ui/Skeleton'
import { MessageSquare } from 'lucide-react'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  hasMore: boolean
  onLoadMore: () => void
  onEditMessage?: (id: string, content: string) => void
  onDeleteMessage?: (id: string) => void
  loading?: boolean
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export function MessageList({
  messages,
  currentUserId,
  hasMore,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
  loading = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(messages.length)
  const isLoadingMoreRef = useRef(false)

  // Auto-scroll to bottom when new messages arrive at the end
  useEffect(() => {
    const prevLen = prevLengthRef.current
    const newLen = messages.length
    prevLengthRef.current = newLen

    // Only auto-scroll if messages were added at the bottom (not prepended history)
    if (newLen > prevLen) {
      const container = containerRef.current
      if (!container) return
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
      if (isNearBottom || prevLen === 0) {
        bottomRef.current?.scrollIntoView({ behavior: prevLen === 0 ? 'auto' : 'smooth' })
      }
    }
  }, [messages])

  // Infinite scroll — load more when sentinel reaches top
  const handleTopSentinel = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore && !isLoadingMoreRef.current) {
        isLoadingMoreRef.current = true
        const container = containerRef.current
        const scrollHeightBefore = container?.scrollHeight ?? 0

        onLoadMore()

        // After loading, restore scroll position
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop += (container.scrollHeight - scrollHeightBefore)
          }
          isLoadingMoreRef.current = false
        })
      }
    },
    [hasMore, onLoadMore]
  )

  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(handleTopSentinel, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleTopSentinel])

  if (loading) return <MessageSkeleton />

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface-overlay)] flex items-center justify-center">
          <MessageSquare size={28} className="text-brand-500 opacity-60" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">No messages yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Be the first to say something!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 sm:px-4 scroll-smooth"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Top sentinel for infinite scroll */}
      <div ref={topSentinelRef} className="h-1" aria-hidden="true" />

      {hasMore && (
        <div className="text-center py-2">
          <span className="text-xs text-[var(--text-muted)]">Loading older messages…</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const showDateSep = !prev || !isSameDay(prev.timestamp, msg.timestamp)

          return (
            <div key={msg.id}>
              {showDateSep && <DateSeparator iso={msg.timestamp} />}
              <MessageBubble
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                onEdit={msg.sender_id === currentUserId ? onEditMessage : undefined}
                onDelete={onDeleteMessage}
              />
            </div>
          )
        })}
      </div>

      <div ref={bottomRef} className="h-1" aria-hidden="true" />
    </div>
  )
}
