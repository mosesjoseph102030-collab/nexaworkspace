import { AnimatePresence, motion } from 'framer-motion'
import { Users, X, ShieldCheck, Crown } from 'lucide-react'
import type { WorkspaceMember } from '@/types'
import { usePresence } from '@/hooks/usePresence'

interface SidebarProps {
  members: WorkspaceMember[]
  ownerId: string
  currentUserId: string
  mobileOpen: boolean
  onMobileClose: () => void
  onManageMembers?: () => void
  isOwner: boolean
}

function MemberRow({
  member,
  currentUserId,
  ownerId,
}: {
  member: WorkspaceMember
  currentUserId: string
  ownerId: string
}) {
  const { isOnline } = usePresence()
  const online = isOnline(member.user_id)
  const isCurrentUser = member.user_id === currentUserId
  const isMemberOwner = member.user_id === ownerId

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[var(--surface-raised)] transition-colors group cursor-default">
      {/* Avatar with presence */}
      <div className="relative flex-shrink-0">
        <div
          className={[
            'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold select-none',
            isMemberOwner
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white',
          ].join(' ')}
          aria-hidden="true"
        >
          {member.display_name[0]?.toUpperCase()}
        </div>
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)]',
            online ? 'bg-emerald-500' : 'bg-[var(--text-muted)] opacity-50',
          ].join(' ')}
          aria-label={`${member.display_name} is ${online ? 'online' : 'offline'}`}
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={[
            'text-xs font-medium truncate',
            online ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
          ].join(' ')}>
            {member.display_name}
          </span>
          {isMemberOwner && (
            <Crown size={10} className="text-amber-500 flex-shrink-0" aria-label="Owner" />
          )}
        </div>
        {isCurrentUser && (
          <span className="text-[10px] text-brand-500">you</span>
        )}
      </div>
    </div>
  )
}

export function Sidebar({
  members,
  ownerId,
  currentUserId,
  mobileOpen,
  onMobileClose,
  onManageMembers,
  isOwner,
}: SidebarProps) {
  const { isOnline } = usePresence()

  // Split into online / offline for better UX
  const online = members.filter(m => isOnline(m.user_id))
  const offline = members.filter(m => !isOnline(m.user_id))

  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none">

      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Members
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--text-muted)] font-medium">
            {members.length}
          </span>
        </div>
        <button
          onClick={onMobileClose}
          className="sm:hidden p-1 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)]"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5">

        {/* Online section */}
        {online.length > 0 && (
          <>
            <div className="px-2 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Online — {online.length}
              </span>
            </div>
            {online.map(m => (
              <MemberRow key={m.id} member={m} currentUserId={currentUserId} ownerId={ownerId} />
            ))}
          </>
        )}

        {/* Offline section */}
        {offline.length > 0 && (
          <>
            <div className={['px-2 py-1 flex items-center gap-1.5', online.length > 0 ? 'mt-2' : ''].join(' ')}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-50" />
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Offline — {offline.length}
              </span>
            </div>
            {offline.map(m => (
              <MemberRow key={m.id} member={m} currentUserId={currentUserId} ownerId={ownerId} />
            ))}
          </>
        )}

        {members.length === 0 && (
          <div className="text-center py-10 px-4">
            <Users size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
            <p className="text-xs text-[var(--text-muted)]">No members yet</p>
          </div>
        )}
      </div>

      {/* Owner: manage members link */}
      {isOwner && onManageMembers && (
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={onManageMembers}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-brand-500 hover:bg-brand-500/10 transition-colors"
          >
            <ShieldCheck size={14} />
            Manage members
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex flex-col w-56 border-r border-[var(--border)] bg-[var(--surface)] flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 sm:hidden"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-[var(--surface)] border-r border-[var(--border)] sm:hidden flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
