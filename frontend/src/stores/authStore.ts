import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null  // In-memory ONLY — never persisted
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, token) =>
    set({ user, accessToken: token, isAuthenticated: true }),

  setAccessToken: (token) =>
    set({ accessToken: token }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
}))
