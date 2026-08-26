import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#6366f1', // primary
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Surface tokens (used via CSS vars in globals.css)
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
        },
        // Chat bubble tokens
        bubble: {
          own: 'var(--bubble-own)',
          other: 'var(--bubble-other)',
          'own-text': 'var(--bubble-own-text)',
          'other-text': 'var(--bubble-other-text)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px 0 rgba(0,0,0,0.10)',
        'glass-dark': '0 4px 24px 0 rgba(0,0,0,0.40)',
        'bubble': '0 2px 8px rgba(99,102,241,0.18)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
} satisfies Config
