import { apiClient } from '@/api/client'
import type {
  Workspace,
  WorkspacePublic,
  WorkspaceMember,
  MemberStatusResponse,
} from '@/types'

export const workspaceApi = {
  create: (name: string) =>
    apiClient.post<Workspace>('/api/workspaces', { name }).then(r => r.data),

  getBySlug: (slug: string) =>
    apiClient.get<WorkspacePublic>(`/api/workspaces/${slug}`).then(r => r.data),

  update: (slug: string, name: string) =>
    apiClient.patch<Workspace>(`/api/workspaces/${slug}`, { name }).then(r => r.data),

  delete: (slug: string) =>
    apiClient.delete(`/api/workspaces/${slug}`).then(r => r.data),

  // Members
  requestMembership: (slug: string, display_name: string) =>
    apiClient
      .post<WorkspaceMember>(`/api/workspaces/${slug}/members/request`, { display_name })
      .then(r => r.data),

  listMembers: (slug: string) =>
    apiClient
      .get<WorkspaceMember[]>(`/api/workspaces/${slug}/members`)
      .then(r => r.data),

  listPending: (slug: string) =>
    apiClient
      .get<WorkspaceMember[]>(`/api/workspaces/${slug}/members/pending`)
      .then(r => r.data),

  getMembershipStatus: (slug: string) =>
    apiClient
      .get<MemberStatusResponse>(`/api/workspaces/${slug}/members/me`)
      .then(r => r.data),

  approveMember: (slug: string, memberId: string) =>
    apiClient
      .post<WorkspaceMember>(`/api/workspaces/${slug}/members/${memberId}/approve`)
      .then(r => r.data),

  declineMember: (slug: string, memberId: string) =>
    apiClient
      .post(`/api/workspaces/${slug}/members/${memberId}/decline`)
      .then(r => r.data),

  removeMember: (slug: string, memberId: string) =>
    apiClient
      .delete(`/api/workspaces/${slug}/members/${memberId}`)
      .then(r => r.data),
}
