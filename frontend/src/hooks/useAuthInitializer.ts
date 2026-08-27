/**
 * useAuthInitializer
 *
 * Runs ONCE on app mount. Attempts to restore the in-memory access token
 * from the httpOnly refresh-token cookie. This is needed because Zustand
 * state is wiped on every page load — the refresh cookie is the only thing
 * that survives across navigations in production.
 *
 * Without this, useWebSocket reads accessToken = null and never connects.
 */
import { useEffect, useState } from 'react'
import { authApi } from '@/api/endpoints/auth'
import { useAuthStore } from '@/stores/authStore'

export function useAuthInitializer() {
    const [ready, setReady] = useState(false)
    const setAuth = useAuthStore(s => s.setAuth)
    const clearAuth = useAuthStore(s => s.clearAuth)
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)

    useEffect(() => {
        // If Zustand already has a token (e.g. same-session navigation), skip.
        if (isAuthenticated) {
            setReady(true)
            return
        }

        let cancelled = false

            ; (async () => {
                try {
                    // Use the httpOnly refresh cookie to get a fresh access token
                    const { access_token } = await authApi.refreshToken()
                    // Then fetch the current user profile
                    const user = await authApi.me()
                    if (!cancelled) {
                        setAuth(user, access_token)
                    }
                } catch {
                    // Refresh token missing / expired → clear any stale state
                    if (!cancelled) {
                        clearAuth()
                    }
                } finally {
                    if (!cancelled) {
                        setReady(true)
                    }
                }
            })()

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Run only once on mount

    return ready
}
