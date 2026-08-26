import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-bubble focus-visible:ring-brand-400',
  secondary:
    'bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)] text-[var(--text-primary)] border border-[var(--border)] focus-visible:ring-brand-400',
  ghost:
    'bg-transparent hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-brand-400',
  danger:
    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white focus-visible:ring-red-400',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-xl',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      onClick={props.onClick}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      type={props.type ?? 'button'}
      id={props.id}
      aria-label={props['aria-label']}
      style={props.style}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  )
  }
)

Button.displayName = 'Button'
