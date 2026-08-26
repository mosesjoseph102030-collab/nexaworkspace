import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Check, X, Bell } from 'lucide-react'
import type { WorkspaceMember } from '@/types'

interface JoinRequestNotificationProps {
  pendingMembers: WorkspaceMember[]
  onApprove: (id: string) => void
  onDecline: (id: string) => void
  approving: Set<string>
  declining: Set<string>
}

export function JoinRequestNotification({
  pendingMembers,
  onApprove,
  onDecline,
  approving,
  declining,
}: JoinRequestNotificationProps) {
  if (pendingMembers.length === 0) return null

  return (
    <div className="flex-shrink-0 border-b border-amber-500/20 bg-amber-500/5">
      <AnimatePresence mode="popLayout">
        {pendingMembers.map(member => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            {/* Icon */}
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <UserPlus size={13} className="text-amber-600 dark:text-amber-400" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-primary)]">
                <span className="font-semibold">{member.display_name}</span>
                <span className="text-[var(--text-muted)]"> wants to join the workspace</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onDecline(member.id)}
                disabled={approving.has(member.id) || declining.has(member.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                aria-label={`Decline ${member.display_name}`}
              >
                {declining.has(member.id)
                  ? <span className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                  : <X size={13} />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onApprove(member.id)}
                disabled={approving.has(member.id) || declining.has(member.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                aria-label={`Approve ${member.display_name}`}
              >
                {approving.has(member.id)
                  ? <span className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  : <Check size={13} />}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {pendingMembers.length > 1 && (
        <div className="px-4 pb-2 flex items-center gap-1.5">
          <Bell size={11} className="text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {pendingMembers.length} pending requests
          </span>
        </div>
      )}
    </div>
  )
}
