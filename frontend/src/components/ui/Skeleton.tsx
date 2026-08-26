interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={[
        'rounded-lg bg-[var(--surface-overlay)] animate-pulse',
        className,
      ].join(' ')}
      aria-hidden="true"
    />
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={['flex gap-3', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'].join(' ')}
        >
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1.5 max-w-xs">
            <Skeleton className="h-3 w-16" />
            <Skeleton className={['h-10 rounded-2xl', i % 3 === 0 ? 'w-48' : 'w-64'].join(' ')} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl mt-2" />
    </div>
  )
}
