import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ThemeProvider } from '@/theme/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { useAuthInitializer } from '@/hooks/useAuthInitializer'

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const CreateWorkspace = lazy(() => import('@/pages/CreateWorkspace'))
const Chat = lazy(() => import('@/pages/Chat'))
const JoinRequest = lazy(() => import('@/pages/JoinRequest'))
const PendingApproval = lazy(() => import('@/pages/PendingApproval'))
const OwnerDashboard = lazy(() => import('@/pages/OwnerDashboard'))
const SystemMonitor = lazy(() => import('@/pages/SystemMonitor'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 animate-pulse" />
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Restores session from httpOnly refresh cookie on every page load.
 * Renders nothing (just the pagefallback spinner) until the attempt completes.
 * This ensures useWebSocket always sees a valid accessToken, not null.
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const ready = useAuthInitializer()
  if (!ready) return <PageFallback />
  return <>{children}</>
}

/** Redirects unauthenticated users to login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/system-monitor" element={<SystemMonitor />} />

        {/* Workspace public routes */}
        <Route path="/:slug/join" element={<JoinRequest />} />
        <Route path="/:slug/pending" element={<PendingApproval />} />

        {/* Protected workspace routes */}
        <Route path="/create-workspace" element={
          <ProtectedRoute><CreateWorkspace /></ProtectedRoute>
        } />
        <Route path="/:slug" element={
          <ProtectedRoute><Chat /></ProtectedRoute>
        } />
        <Route path="/:slug/dashboard" element={
          <ProtectedRoute><OwnerDashboard /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthInitializer>
              <AppRoutes />
            </AuthInitializer>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
