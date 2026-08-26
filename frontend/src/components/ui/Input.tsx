import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-xl border bg-[var(--surface-raised)] text-[var(--text-primary)]',
              'placeholder:text-[var(--text-muted)] text-sm',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[var(--border)] hover:border-brand-400',
              leftIcon ? 'pl-10' : 'pl-4',
              rightElement ? 'pr-10' : 'pr-4',
              'py-2.5',
              className,
            ].join(' ')}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3">{rightElement}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-500 flex items-center gap-1" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
