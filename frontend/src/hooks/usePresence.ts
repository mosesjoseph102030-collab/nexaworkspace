import { useChatStore } from '@/stores/chatStore'

export function usePresence() {
  const presence = useChatStore(s => s.presence)

  const isOnline = (userId: string): boolean =>
    presence.get(userId)?.status === 'online'

  const getStatus = (userId: string) =>
    presence.get(userId)?.status ?? 'offline'

  const onlineCount = Array.from(presence.values()).filter(p => p.status === 'online').length

  return { presence, isOnline, getStatus, onlineCount }
}
