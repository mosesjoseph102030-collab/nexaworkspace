import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { aiApi } from '@/api/endpoints/ai'
import { Skeleton } from '@/components/ui/Skeleton'

interface SmartReplySuggestionsProps {
  slug: string
  lastMessageId: string | null
  lastMessageSenderId: string
  currentUserId: string
  onSelect: (text: string) => void
}

export function SmartReplySuggestions({
  slug,
  lastMessageId,
  lastMessageSenderId,
  currentUserId,
  onSelect,
}: SmartReplySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Only show suggestions when the last message is from someone else
  const shouldFetch = lastMessageId && lastMessageSenderId !== currentUserId

  useEffect(() => {
    if (!shouldFetch || !lastMessageId) {
      setSuggestions([])
      return
    }

    let cancelled = false
    setLoading(true)

    aiApi.smartReplies(slug, lastMessageId)
      .then(res => {
        if (!cancelled) setSuggestions(res.suggestions)
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug, lastMessageId, shouldFetch, currentUserId])

  if (!shouldFetch) return null

  return (
    <div className="flex-shrink-0 px-3 sm:px-4 pb-2">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles size={12} className="text-brand-500 opacity-60" />
            <div className="flex gap-2">
              {[60, 80, 70].map((w, i) => (
                <Skeleton key={i} className={`h-7 rounded-full w-${w === 60 ? '16' : w === 80 ? '20' : '18'}`} />
              ))}
            </div>
          </motion.div>
        ) : suggestions.length > 0 ? (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5"
          >
            <Sparkles size={12} className="text-brand-500 flex-shrink-0 opacity-70" aria-hidden="true" />
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSelect(s)}
                className={[
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium',
                  'bg-brand-500/10 text-brand-600 dark:text-brand-400',
                  'border border-brand-500/20 hover:border-brand-500/50',
                  'hover:bg-brand-500/15 transition-all duration-150',
                  'focus-visible:ring-2 focus-visible:ring-brand-500',
                ].join(' ')}
                aria-label={`Reply: ${s}`}
              >
                {s}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
