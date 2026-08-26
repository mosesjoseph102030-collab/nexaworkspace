import { apiClient } from '@/api/client'
import type { Message, MessagePage } from '@/types'

export const messagesApi = {
  list: (slug: string, cursor?: string, limit = 50) =>
    apiClient
      .get<MessagePage>(`/api/workspaces/${slug}/messages`, {
        params: { cursor, limit },
      })
      .then(r => r.data),

  send: (slug: string, content: string) =>
    apiClient
      .post<Message>(`/api/workspaces/${slug}/messages`, { content })
      .then(r => r.data),

  edit: (slug: string, messageId: string, content: string) =>
    apiClient
      .patch<Message>(`/api/workspaces/${slug}/messages/${messageId}`, { content })
      .then(r => r.data),

  delete: (slug: string, messageId: string) =>
    apiClient
      .delete(`/api/workspaces/${slug}/messages/${messageId}`)
      .then(r => r.data),
}
