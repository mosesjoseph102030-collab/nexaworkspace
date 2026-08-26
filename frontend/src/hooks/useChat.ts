import { useCallback, useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { messagesApi } from '@/api/endpoints/messages'
import { useAuthStore } from '@/stores/authStore'
import type { WsEvent, Message } from '@/types'

export function useChat(slug: string) {
  const store = useChatStore()
  const user = useAuthStore(s => s.user)

  // Load initial history on mount
  useEffect(() => {
    store.clearChat()
    let cancelled = false

    messagesApi.list(slug, undefined, 50).then(page => {
      if (cancelled) return
      // API returns newest-first; reverse for display (oldest at top)
      store.setMessages([...page.messages].reverse())
      if (page.next_cursor) {
        useChatStore.setState({ nextCursor: page.next_cursor, hasMore: page.has_more })
      }
    }).catch(() => { /* silently fail — WS will keep working */ })

    return () => { cancelled = true }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load older messages (infinite scroll up)
  const loadMore = useCallback(async () => {
    const { nextCursor, hasMore } = useChatStore.getState()
    if (!hasMore || !nextCursor) return

    const page = await messagesApi.list(slug, nextCursor, 50)
    store.prependHistory(
      [...page.messages].reverse(),
      page.next_cursor,
      page.has_more,
    )
  }, [slug, store])

  // Handle incoming WS events
  const handleEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case 'message': {
        const msg: Message = {
          id: event.id,
          room_id: event.room_id,
          sender_id: event.sender_id,
          sender_name: event.sender_name,
          content: event.content,
          timestamp: event.timestamp,
          is_read: event.is_read,
          edited_at: event.edited_at,
        }
        store.addMessage(msg)
        // Clear typing indicator for the sender
        store.setTyping(event.sender_id, event.sender_name, false)
        break
      }
      case 'typing':
        store.setTyping(event.user_id, event.display_name, event.is_typing)
        break
      case 'presence':
        store.setPresence(event.user_id, event.display_name, event.status)
        break
      case 'message_edited':
        store.updateMessage(event.message_id, {
          content: event.content,
          edited_at: event.edited_at,
        })
        break
      case 'message_deleted':
        store.removeMessage(event.message_id)
        break
    }
  }, [store])

  // Auto-expire typing indicators after 3s with no update
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      const { typingUsers } = useChatStore.getState()
      typingUsers.forEach((entry, userId) => {
        if (now - entry.at > 3000) {
          store.setTyping(userId, entry.displayName, false)
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [store])

  const sendMessage = useCallback((sendEvent: (e: object) => void, content: string) => {
    if (!content.trim()) return
    sendEvent({ type: 'message', content: content.trim() })
  }, [])

  return {
    messages: store.messages,
    typingUsers: store.typingUsers,
    presence: store.presence,
    hasMore: store.hasMore,
    loadMore,
    handleEvent,
    sendMessage,
    currentUserId: user?.id ?? '',
  }
}
