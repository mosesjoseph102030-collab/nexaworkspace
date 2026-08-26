import { apiClient } from '@/api/client'
import type { Announcement } from '@/types'

export const announcementsApi = {
  get: (slug: string) =>
    apiClient
      .get<Announcement | null>(`/api/workspaces/${slug}/announcement`)
      .then(r => r.data),

  pin: (slug: string, content: string, emoji = '📌') =>
    apiClient
      .post<Announcement>(`/api/workspaces/${slug}/announcement`, { content, emoji })
      .then(r => r.data),

  unpin: (slug: string) =>
    apiClient
      .delete(`/api/workspaces/${slug}/announcement`)
      .then(r => r.data),
}
