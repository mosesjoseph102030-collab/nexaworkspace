import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Users, Copy, Check } from 'lucide-react'

import { workspaceApi } from '@/api/endpoints/workspace'
import { useAuthStore } from '@/stores/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Header } from '@/components/layout/Header'
import { ApprovalQueue } from '@/components/workspace/ApprovalQueue'
import { MemberCard } from '@/components/workspace/MemberCard'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WsEvent } from '@/types'

export default function OwnerDashboard() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()

  const [approving, setApproving] = useState(new Set<string>())
  const [declining, setDeclining] = useState(new Set<string>())
  const [copied, setCopied] = useState(false)

  const { data: workspace } = useQuery({
    queryKey: ['workspace', slug],
    queryFn: () => workspaceApi.getBySlug(slug!),
    enabled: !!slug,
  })

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', slug],
    queryFn: () => workspaceApi.listMembers(slug!),
    enabled: !!slug,
  })

  const pending = members.filter(m => !m.approved)
  const approved = members.filter(m => m.approved)

  // Real-time join requests via personal WS
  useWebSocket({
    slug: slug!,
    onEvent: (event: WsEvent) => {
      if (event.type === 'join_request') {
        qc.invalidateQueries({ queryKey: ['members', slug] })
      }
    },
    enabled: !!slug && !!user,
  })

  const handleApprove = async (memberId: string) => {
    if (!slug) return
    setApproving(s => new Set(s).add(memberId))
    try {
      await workspaceApi.approveMember(slug, memberId)
      qc.invalidateQueries({ queryKey: ['members', slug] })
      toastSuccess('Member approved')
    } catch {
      toastError('Failed to approve member')
    } finally {
      setApproving(s => { const n = new Set(s); n.delete(memberId); return n })
    }
  }

  const handleDecline = async (memberId: string) => {
    if (!slug) return
    setDeclining(s => new Set(s).add(memberId))
    try {
      await workspaceApi.declineMember(slug, memberId)
      qc.invalidateQueries({ queryKey: ['members', slug] })
      toastSuccess('Request declined')
    } catch {
      toastError('Failed to decline request')
    } finally {
      setDeclining(s => { const n = new Set(s); n.delete(memberId); return n })
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!slug) return
    try {
      await workspaceApi.removeMember(slug, memberId)
      qc.invalidateQueries({ queryKey: ['members', slug] })
      toastSuccess('Member removed')
    } catch {
      toastError('Failed to remove member')
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/${slug}/join`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Header workspaceName={workspace?.name} />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${slug}`)}
            className="p-2 rounded-xl hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Back to chat"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Member Management</h1>
            <p className="text-xs text-[var(--text-muted)]">{workspace?.name}</p>
          </div>
        </div>

        {/* Invite link card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-500/10 to-brand-700/5 border border-brand-500/20">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Invite link</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Share this link with your team to let them request access
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-brand-500 truncate">
              {window.location.origin}/{slug}/join
            </code>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyLink}
              icon={copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Pending approvals */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)]">
            <ApprovalQueue
              pending={pending}
              onApprove={handleApprove}
              onDecline={handleDecline}
              approving={approving}
              declining={declining}
            />
          </div>
        )}

        {/* Active members */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Active Members
            </h2>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-overlay)] px-1.5 py-0.5 rounded-full">
              {approved.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : approved.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-2xl">
              No active members yet. Approve requests above.
            </div>
          ) : (
            <div className="space-y-2">
              {approved.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  isOwner={m.user_id === user?.id}
                  showRemove={m.user_id !== user?.id}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
