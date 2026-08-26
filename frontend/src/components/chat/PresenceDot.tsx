import { usePresence } from '@/hooks/usePresence'

interface PresenceDotProps {
  userId: string
  className?: string
  'aria-label'?: string
}

export function PresenceDot({ userId, className = '', 'aria-label': ariaLabel }: PresenceDotProps) {
  const { isOnline } = usePresence()
  const online = isOnline(userId)

  return (
    <span
      className={[
        'block w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)]',
        online ? 'bg-emerald-500' : 'bg-[var(--text-muted)]',
        className,
      ].join(' ')}
      role="img"
      aria-label={ariaLabel ?? (online ? 'Online' : 'Offline')}
    />
  )
}
