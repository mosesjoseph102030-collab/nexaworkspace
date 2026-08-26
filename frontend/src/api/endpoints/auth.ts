import { apiClient } from '@/api/client'
import type { LoginResponse, TokenResponse, User } from '@/types'

export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    apiClient.post<LoginResponse>('/api/auth/register', data).then(r => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResponse>('/api/auth/login', data).then(r => r.data),

  logout: () =>
    apiClient.post('/api/auth/logout').then(r => r.data),

  refreshToken: () =>
    apiClient.post<TokenResponse>('/api/auth/refresh').then(r => r.data),

  me: () =>
    apiClient.get<User>('/api/auth/me').then(r => r.data),
}
