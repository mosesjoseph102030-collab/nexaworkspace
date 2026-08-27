import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Hash, Copy, Check, Settings } from 'lucide-react'

import { useWebSocket } from '@/hooks/useWebSocket'
import { useChat } from '@/hooks/useChat'
import { useAuthStore } from '@/stores/authStore'
import { workspaceApi } from '@/api/endpoints/workspace'
import { messagesApi } from '@/api/endpoints/messages'
import { announcementsApi } from '@/api/endpoints/announcements'

import { Sidebar } from '@/components/layout/Sidebar'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { AIAssistantPanel } from '@/components/chat/AIAssistantPanel'
import { AnnouncementBanner } from '@/components/chat/AnnouncementBanner'
import { JoinRequestNotification } from '@/components/workspace/JoinRequestNotification'
import { Skeleton, MessageSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/theme/ThemeProvider'
import { Moon, Sun, LogOut } from 'lucide-react'
import { authApi } from '@/api/endpoints/auth'

import type { WsEvent, Announcement } from '@/types'

export default function Chat() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const { theme, toggleTheme } = useTheme()
  const { error: toastError, success: toastSuccess } = useToast()

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [approving, setApproving] = useState(new Set<string>())
  const [declining, setDeclining] = useState(new Set<string>())
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: workspace, isLoading: wsLoading, error: wsError } = useQuery({
    queryKey: ['workspace', slug],
    queryFn: () => workspaceApi.getBySlug(slug!),
    enabled: !!slug,
    retry: 1,
  })

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['members', slug],
    queryFn: () => workspaceApi.listMembers(slug!),
    enabled: !!slug && !!memberStatus,
    refetchInterval: 30_000,
    retry: false,
  })

  const { data: memberStatus } = useQuery({
    queryKey: ['memberStatus', slug],
    queryFn: () => workspaceApi.getMembershipStatus(slug!),
    enabled: !!slug,
  })

  const isOwner = memberStatus?.status === 'owner'
  const approvedMembers = members.filter(m => m.approved)
  const pendingMembers = members.filter(m => !m.approved)

  // Load current pinned announcement
  useEffect(() => {
    if (!slug || !memberStatus) return
    announcementsApi.get(slug)
      .then(ann => setAnnouncement(ann))
      .catch(() => {})
  }, [slug, memberStatus])

  // ── Auth redirect ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!memberStatus) return
    const s = memberStatus.status
    if (s === 'none') navigate(`/${slug}/join`, { replace: true })
    if (s === 'pending') navigate(`/${slug}/pending`, { replace: true })
  }, [memberStatus, slug, navigate])

  // ── Chat ───────────────────────────────────────────────────────────────────

  const { messages, hasMore, loadMore, handleEvent, sendMessage, currentUserId } = useChat(slug!)

  const onWsEvent = useCallback((event: WsEvent) => {
    handleEvent(event)
    if (event.type === 'join_request') {
      refetchMembers()
    }
    if (event.type === 'announcement_pinned') {
      setAnnouncement({
        id: event.id,
        workspace_id: event.workspace_id,
        content: event.content,
        emoji: event.emoji,
        author_name: event.author_name,
        pinned: true,
        created_at: event.created_at,
      })
    }
    if (event.type === 'announcement_unpinned') {
      setAnnouncement(null)
    }
  }, [handleEvent, refetchMembers])

  const { status: wsStatus, sendEvent } = useWebSocket({
    slug: slug!,
    onEvent: onWsEvent,
    enabled: !!slug && !!user && (memberStatus?.status === 'approved' || isOwner),
  })

  const handleSend = useCallback((content: string) => {
    sendMessage(sendEvent, content)
  }, [sendMessage, sendEvent])

  const handleTypingStart = useCallback(() => sendEvent({ type: 'typing_start' }), [sendEvent])
  const handleTypingStop = useCallback(() => sendEvent({ type: 'typing_stop' }), [sendEvent])

  const handleEditMessage = useCallback(async (id: string, content: string) => {
    if (!slug) return
    try { await messagesApi.edit(slug, id, content) }
    catch { toastError('Failed to edit message') }
  }, [slug, toastError])

  const handleDeleteMessage = useCallback(async (id: string) => {
    if (!slug) return
    try { await messagesApi.delete(slug, id) }
    catch { toastError('Failed to delete message') }
  }, [slug, toastError])

  // ── Approvals (inline, owner only) ────────────────────────────────────────

  const handleApprove = useCallback(async (memberId: string) => {
    if (!slug) return
    setApproving(s => new Set(s).add(memberId))
    try {
      await workspaceApi.approveMember(slug, memberId)
      refetchMembers()
      toastSuccess('Member approved — they can now chat')
    } catch { toastError('Failed to approve member') }
    finally { setApproving(s => { const n = new Set(s); n.delete(memberId); return n }) }
  }, [slug, refetchMembers, toastSuccess, toastError])

  const handleDecline = useCallback(async (memberId: string) => {
    if (!slug) return
    setDeclining(s => new Set(s).add(memberId))
    try {
      await workspaceApi.declineMember(slug, memberId)
      refetchMembers()
      toastSuccess('Request declined')
    } catch { toastError('Failed to decline request') }
    finally { setDeclining(s => { const n = new Set(s); n.delete(memberId); return n }) }
  }, [slug, refetchMembers, toastSuccess, toastError])

  // ── Copy invite link ───────────────────────────────────────────────────────

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}/join`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try { await authApi.logout() } catch { }
    clearAuth()
    navigate('/login')
  }

  // ── AI panel ───────────────────────────────────────────────────────────────

  const lastMessage = messages[messages.length - 1] ?? null

  const handleAiReplySelect = useCallback((text: string) => {
    handleSend(text)
  }, [handleSend])

  // ── Loading / error states ──────────────────────────────────────────────────

  if (wsLoading || !memberStatus) {
    return (
      <div className="h-screen flex flex-col bg-[var(--surface)]">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-4 gap-3">
          <Skeleton className="w-7 h-7 rounded-xl" />
          <Skeleton className="w-36 h-4" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden sm:block w-60 border-r border-[var(--border)] p-3 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
          </div>
          <MessageSkeleton />
        </div>
      </div>
    )
  }

  if (wsError) {
    return (
      <div className="h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Workspace not found</h2>
          <p className="text-[var(--text-muted)] text-sm mt-2">This workspace doesn't exist or you don't have access.</p>
          <button onClick={() => navigate('/')} className="mt-6 text-brand-500 text-sm hover:underline">Go home</button>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[var(--surface)] overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center gap-3 px-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0 z-10">

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileSidebarOpen(v => !v)}
          className="sm:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">N</span>
          </div>
        </div>

        {/* Channel name */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Hash size={15} className="text-[var(--text-muted)] flex-shrink-0" />
          <span className="font-semibold text-[var(--text-primary)] text-sm truncate">
            {workspace?.name ?? 'general'}
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] ml-1">
            · {approvedMembers.length} member{approvedMembers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Invite link button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCopyLink}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
            aria-label="Copy invite link"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Invite'}</span>
          </motion.button>

          {/* Manage members (owner only) */}
          {isOwner && (
            <button
              onClick={() => navigate(`/${slug}/dashboard`)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
              aria-label="Manage members"
            >
              <Settings size={16} />
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — shows approved members with presence */}
        <Sidebar
          members={approvedMembers}
          ownerId={isOwner ? (user?.id ?? '') : ''}
          currentUserId={currentUserId}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          isOwner={isOwner}
          onManageMembers={isOwner ? () => navigate(`/${slug}/dashboard`) : undefined}
        />

        {/* ── Main chat column ─────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">

          {/* Join request notifications — owner only, real-time */}
          {isOwner && (
            <JoinRequestNotification
              pendingMembers={pendingMembers}
              onApprove={handleApprove}
              onDecline={handleDecline}
              approving={approving}
              declining={declining}
            />
          )}

          {/* Pinned announcement */}
          <AnnouncementBanner
            slug={slug!}
            announcement={announcement}
            isOwner={isOwner}
            onAnnouncementChange={setAnnouncement}
          />

          {/* WS reconnecting banner */}
          <AnimatePresence>
            {(wsStatus === 'reconnecting' || wsStatus === 'connecting') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center justify-center gap-2 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex-shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {wsStatus === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />

          {/* Typing indicator */}
          <TypingIndicator />

          {/* Message input */}
          <MessageInput
            onSend={handleSend}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            connectionStatus={wsStatus}
          />
        </div>
      </div>

      {/* ── AI Assistant floating panel ──────────────────────────────────────── */}
      <AIAssistantPanel
        slug={slug!}
        lastMessageId={lastMessage?.id ?? null}
        lastMessageSenderId={lastMessage?.sender_id ?? ''}
        currentUserId={currentUserId}
        onSelectReply={handleAiReplySelect}
      />
    </div>
  )
}
