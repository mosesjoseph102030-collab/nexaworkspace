// ── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  created_at: string
  is_active: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ── Workspace ───────────────────────────────────────────────────────────────

export interface WorkspacePublic {
  id: string
  name: string
  slug: string
  owner_name: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
  is_active: boolean
}

// ── Members ─────────────────────────────────────────────────────────────────

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  display_name: string
  approved: boolean
  joined_at: string
}

export type MemberStatus = 'none' | 'pending' | 'approved' | 'owner'

export interface MemberStatusResponse {
  status: MemberStatus
}

// ── Chat ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  room_id: string
  sender_id: string
  sender_name: string
  content: string
  timestamp: string
  is_read: boolean
  edited_at: string | null
}

export interface MessagePage {
  messages: Message[]
  next_cursor: string | null
  has_more: boolean
}

// ── AI ──────────────────────────────────────────────────────────────────────

export interface SmartReplyResponse {
  suggestions: string[]
}

export interface SummaryResponse {
  summary: string
  message_count: number
  from_ts: string | null
  to_ts: string | null
}

// ── WebSocket Events ────────────────────────────────────────────────────────

export type PresenceStatus = 'online' | 'offline'

export interface WsMessageEvent {
  type: 'message'
  id: string
  room_id: string
  sender_id: string
  sender_name: string
  content: string
  timestamp: string
  is_read: boolean
  edited_at: string | null
}

export interface WsTypingEvent {
  type: 'typing'
  user_id: string
  display_name: string
  is_typing: boolean
}

export interface WsPresenceEvent {
  type: 'presence'
  user_id: string
  display_name: string
  status: PresenceStatus
}

export interface WsApprovedEvent {
  type: 'approved'
  workspace_slug: string
  workspace_name: string
}

export interface WsDeclinedEvent {
  type: 'declined'
  workspace_slug: string
}

export interface WsJoinRequestEvent {
  type: 'join_request'
  workspace_slug: string
  workspace_name: string
  member_id: string
  display_name: string
  user_id: string
}

export interface WsConnectedEvent {
  type: 'connected'
  workspace_id: string
  user_id: string
}

export interface WsPongEvent { type: 'pong' }
export interface WsErrorEvent { type: 'error'; message: string }
export interface WsMessageEditedEvent { type: 'message_edited'; message_id: string; content: string; edited_at: string }
export interface WsMessageDeletedEvent { type: 'message_deleted'; message_id: string }

/** Sent once to a newly-connected socket so it knows who is already online. */
export interface WsPresenceSnapshotEvent {
  type: 'presence_snapshot'
  users: Array<{ user_id: string; display_name: string; status: PresenceStatus }>
}

export type WsEvent =
  | WsMessageEvent
  | WsTypingEvent
  | WsPresenceEvent
  | WsPresenceSnapshotEvent
  | WsApprovedEvent
  | WsDeclinedEvent
  | WsJoinRequestEvent
  | WsConnectedEvent
  | WsPongEvent
  | WsErrorEvent
  | WsMessageEditedEvent
  | WsMessageDeletedEvent
  | WsAnnouncementPinnedEvent
  | WsAnnouncementUnpinnedEvent

// ── API Errors ───────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string
  code: string
}

// ── Announcements ────────────────────────────────────────────────────────────

export interface Announcement {
  id: string
  workspace_id: string
  content: string
  emoji: string
  author_name: string
  pinned: boolean
  created_at: string
}

export interface WsAnnouncementPinnedEvent {
  type: 'announcement_pinned'
  id: string
  workspace_id: string
  content: string
  emoji: string
  author_name: string
  created_at: string
}

export interface WsAnnouncementUnpinnedEvent {
  type: 'announcement_unpinned'
  workspace_id: string
}
