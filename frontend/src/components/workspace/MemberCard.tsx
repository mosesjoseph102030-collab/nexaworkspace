import { motion } from 'framer-motion'
import { UserX, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { WorkspaceMember } from '@/types'

interface MemberCardProps {
  member: WorkspaceMember
  isOwner: boolean
  onRemove?: (id: string) => void
  showRemove?: boolean
}

export function MemberCard({ member, isOwner, onRemove, showRemove }: MemberCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'flex items-center gap-3 p-3 rounded-xl',
        'bg-[var(--surface-raised)] border border-[var(--border)]',
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className={[
          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
          isOwner
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
            : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white',
        ].join(' ')}
        aria-hidden="true"
      >
        {member.display_name[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {member.display_name}
          </span>
          {isOwner && <Crown size={12} className="text-amber-500 flex-shrink-0" aria-label="Owner" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant={member.approved ? 'success' : 'warning'} size="sm">
            {member.approved ? 'Active' : 'Pending'}
          </Badge>
          <span className="text-xs text-[var(--text-muted)]">
            Joined {new Date(member.joined_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Remove button */}
      {showRemove && !isOwner && onRemove && (
        <button
          onClick={() => onRemove(member.id)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          aria-label={`Remove ${member.display_name}`}
        >
          <UserX size={16} />
        </button>
      )}
    </motion.div>
  )
}
