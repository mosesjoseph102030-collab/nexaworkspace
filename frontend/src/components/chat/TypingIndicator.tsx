import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

export function TypingIndicator() {
  const typingUsers = useChatStore(s => s.typingUsers)
  const currentUserId = useAuthStore(s => s.user?.id)

  const others = Array.from(typingUsers.entries())
    .filter(([uid]) => uid !== currentUserId)
    .map(([, entry]) => entry.displayName)

  if (others.length === 0) return null

  const label =
    others.length === 1
      ? `${others[0]} is typing…`
      : others.length === 2
      ? `${others[0]} and ${others[1]} are typing…`
      : 'Several people are typing…'

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5"
      aria-live="polite"
      aria-label={label}
    >
      {/* Animated dots */}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--text-muted)] italic">{label}</span>
    </div>
  )
}
