import { apiClient } from '@/api/client'
import type { SmartReplyResponse, SummaryResponse } from '@/types'

export const aiApi = {
  smartReplies: (slug: string, lastMessageId: string) =>
    apiClient
      .post<SmartReplyResponse>(`/api/workspaces/${slug}/ai/smart-replies`, {
        last_message_id: lastMessageId,
      })
      .then(r => r.data),

  summary: (slug: string, lastNMessages = 50) =>
    apiClient
      .post<SummaryResponse>(`/api/workspaces/${slug}/ai/summary`, {
        last_n_messages: lastNMessages,
      })
      .then(r => r.data),
}
