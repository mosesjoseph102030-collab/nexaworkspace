import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { WorkspaceMember } from '@/types'

interface ApprovalQueueProps {
  pending: WorkspaceMember[]
  onApprove: (id: string) => void
  onDecline: (id: string) => void
  approving: Set<string>
  declining: Set<string>
}

export function ApprovalQueue({
  pending,
  onApprove,
  onDecline,
  approving,
  declining,
}: ApprovalQueueProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-[var(--text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Pending Requests
        </h3>
        {pending.length > 0 && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {pending.length}
          </span>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {pending.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-[var(--text-muted)] text-sm"
          >
            No pending requests
          </motion.div>
        ) : (
          pending.map(member => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              layout
              className={[
                'flex items-center gap-3 p-3 rounded-xl',
                'bg-amber-500/5 border border-amber-500/20',
              ].join(' ')}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                aria-hidden="true"
              >
                {member.display_name[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {member.display_name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Requested {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onDecline(member.id)}
                  loading={declining.has(member.id)}
                  disabled={approving.has(member.id)}
                  icon={<X size={14} />}
                  aria-label={`Decline ${member.display_name}`}
                >
                  <span className="hidden sm:inline">Decline</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onApprove(member.id)}
                  loading={approving.has(member.id)}
                  disabled={declining.has(member.id)}
                  icon={<Check size={14} />}
                  aria-label={`Approve ${member.display_name}`}
                >
                  <span className="hidden sm:inline">Approve</span>
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  )
}
