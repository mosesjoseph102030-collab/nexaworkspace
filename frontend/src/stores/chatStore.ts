import { create } from 'zustand'
import type { Message, PresenceStatus } from '@/types'

interface PresenceEntry {
  userId: string
  displayName: string
  status: PresenceStatus
}

interface ChatState {
  messages: Message[]
  typingUsers: Map<string, { displayName: string; at: number }>
  presence: Map<string, PresenceEntry>
  hasMore: boolean
  nextCursor: string | null

  // Actions
  setMessages: (msgs: Message[]) => void
  prependHistory: (msgs: Message[], nextCursor: string | null, hasMore: boolean) => void
  addMessage: (msg: Message) => void
  updateMessage: (id: string, patch: Partial<Message>) => void
  removeMessage: (id: string) => void
  setTyping: (userId: string, displayName: string, isTyping: boolean) => void
  setPresence: (userId: string, displayName: string, status: PresenceStatus) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  typingUsers: new Map(),
  presence: new Map(),
  hasMore: false,
  nextCursor: null,

  setMessages: (msgs) => set({ messages: msgs }),

  prependHistory: (msgs, nextCursor, hasMore) =>
    set(state => ({
      messages: [...msgs, ...state.messages],
      nextCursor,
      hasMore,
    })),

  addMessage: (msg) =>
    set(state => {
      // Deduplicate by real id
      if (state.messages.some(m => m.id === msg.id)) return state

      // Replace optimistic message with confirmed one (same sender + content)
      if (!msg.id.startsWith('optimistic-')) {
        const optimisticIndex = state.messages.findIndex(
          m => m.id.startsWith('optimistic-') &&
               m.sender_id === msg.sender_id &&
               m.content === msg.content
        )
        if (optimisticIndex !== -1) {
          const updated = [...state.messages]
          updated[optimisticIndex] = msg
          return { messages: updated }
        }
      }

      return { messages: [...state.messages, msg] }
    }),

  updateMessage: (id, patch) =>
    set(state => ({
      messages: state.messages.map(m => m.id === id ? { ...m, ...patch } : m),
    })),

  removeMessage: (id) =>
    set(state => ({
      messages: state.messages.filter(m => m.id !== id),
    })),

  setTyping: (userId, displayName, isTyping) =>
    set(state => {
      const next = new Map(state.typingUsers)
      if (isTyping) {
        next.set(userId, { displayName, at: Date.now() })
      } else {
        next.delete(userId)
      }
      return { typingUsers: next }
    }),

  setPresence: (userId, displayName, status) =>
    set(state => {
      const next = new Map(state.presence)
      next.set(userId, { userId, displayName, status })
      return { presence: next }
    }),

  clearChat: () =>
    set({ messages: [], typingUsers: new Map(), presence: new Map(), nextCursor: null, hasMore: false }),
}))
