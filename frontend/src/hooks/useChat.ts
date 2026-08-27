import { useCallback, useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { messagesApi } from '@/api/endpoints/messages'
import { useAuthStore } from '@/stores/authStore'
import type { WsEvent, Message } from '@/types'

export function useChat(slug: string) {
  // ── Use individual stable selectors instead of the full store object.
  // Subscribing to the whole store (`useChatStore()`) creates a new object on every
  // render, which was destabilising handleEvent and causing it to be re-created
  // on every incoming message — leading to potential races in the WS event dispatch.
  const messages = useChatStore(s => s.messages)
  const hasMore = useChatStore(s => s.hasMore)
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const removeMessage = useChatStore(s => s.removeMessage)
  const setTyping = useChatStore(s => s.setTyping)
  const setPresence = useChatStore(s => s.setPresence)
  const clearChat = useChatStore(s => s.clearChat)
  const prependHistory = useChatStore(s => s.prependHistory)
  const typingUsers = useChatStore(s => s.typingUsers)
  const presence = useChatStore(s => s.presence)

  const user = useAuthStore(s => s.user)

  // Load initial history on mount
  useEffect(() => {
    clearChat()
    let cancelled = false

    messagesApi.list(slug, undefined, 50).then(page => {
      if (cancelled) return
      // API returns newest-first; reverse for display (oldest at top)
      useChatStore.getState().setMessages([...page.messages].reverse())
      if (page.next_cursor) {
        useChatStore.setState({ nextCursor: page.next_cursor, hasMore: page.has_more })
      }
    }).catch(() => { /* silently fail — WS will keep working */ })

    return () => { cancelled = true }
  }, [slug, clearChat])

  // Load older messages (infinite scroll up)
  const loadMore = useCallback(async () => {
    const { nextCursor, hasMore } = useChatStore.getState()
    if (!hasMore || !nextCursor) return

    const page = await messagesApi.list(slug, nextCursor, 50)
    prependHistory(
      [...page.messages].reverse(),
      page.next_cursor,
      page.has_more,
    )
  }, [slug, prependHistory])

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
        addMessage(msg)
        // Clear typing indicator for the sender
        setTyping(event.sender_id, event.sender_name, false)
        break
      }
      case 'typing':
        setTyping(event.user_id, event.display_name, event.is_typing)
        break
      case 'presence':
        setPresence(event.user_id, event.display_name, event.status)
        break
      case 'presence_snapshot':
        // Seed the online roster when we first connect — so we know who was
        // already online before we joined the workspace channel.
        if (Array.isArray(event.users)) {
          for (const u of event.users as { user_id: string; display_name: string; status: string }[]) {
            setPresence(u.user_id, u.display_name, u.status as 'online' | 'offline')
          }
        }
        break
      case 'message_edited':
        updateMessage(event.message_id, {
          content: event.content,
          edited_at: event.edited_at,
        })
        break
      case 'message_deleted':
        removeMessage(event.message_id)
        break
    }
  }, [addMessage, setTyping, setPresence, updateMessage, removeMessage])

  // Auto-expire typing indicators after 3s with no update
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      useChatStore.getState().typingUsers.forEach((entry, userId) => {
        if (now - entry.at > 3000) {
          useChatStore.getState().setTyping(userId, entry.displayName, false)
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const sendMessage = useCallback((sendEvent: (e: object) => void, content: string) => {
    if (!content.trim()) return
    sendEvent({ type: 'message', content: content.trim() })
  }, [])

  return {
    messages,
    typingUsers,
    presence,
    hasMore,
    loadMore,
    handleEvent,
    sendMessage,
    currentUserId: user?.id ?? '',
  }
}
