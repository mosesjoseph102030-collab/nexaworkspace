interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'brand'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  brand: 'bg-brand-500/15 text-brand-600 dark:text-brand-400',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
