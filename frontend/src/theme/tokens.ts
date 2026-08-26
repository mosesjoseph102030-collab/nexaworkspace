/**
 * Design tokens — single source of truth for NEXACHAT's visual language.
 * Consumed by ThemeProvider and referenced in Tailwind config.
 */

export const colors = {
  brand: {
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    secondary: '#a5b8fc',
  },
  status: {
    online: '#10b981',
    offline: '#6b7280',
    pending: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  light: {
    surface: '#ffffff',
    surfaceRaised: '#f8f9ff',
    surfaceOverlay: '#f1f3ff',
    border: '#e5e7f0',
    textPrimary: '#0f0f23',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
  },
  dark: {
    surface: '#0d0d1a',
    surfaceRaised: '#13131f',
    surfaceOverlay: '#1a1a2e',
    border: '#2a2a3d',
    textPrimary: '#f0f0ff',
    textSecondary: '#a0aec0',
    textMuted: '#718096',
  },
} as const

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const

export const radii = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const

export const shadows = {
  glass: '0 4px 24px 0 rgba(0,0,0,0.10)',
  glassDark: '0 4px 24px 0 rgba(0,0,0,0.40)',
  bubble: '0 2px 8px rgba(99,102,241,0.18)',
  sidebar: '4px 0 24px rgba(0,0,0,0.08)',
} as const

export const transitions = {
  fast: '0.1s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
} as const
