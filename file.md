1. Purpose

NEXACHAT is a multi-tenant real-time messaging platform designed for local businesses and small teams who need a private, work-only communication space. It replaces the chaotic use of personal WhatsApp groups with a structured, AI-assisted environment where staff can chat, share updates, and collaborate without mixing personal and professional lives.

The product focuses on simplicity, security, and AI-driven productivity. Business owners get a unique workspace link (e.g., nexa.com/felixbakery) that they share with their staff. Staff request to join, the owner approves them, and everyone can instantly chat in real time.

Key goals:

    Provide an isolated, private space for each business (multi-tenancy).

    Simplify onboarding: one link brings the whole team in.

    Add AI features (smart replies, conversation summaries) to save time.

    Ensure data isolation and security between different businesses.

    Offer real‑time messaging with WebSockets, no page refresh.

2. Problems Solved
2.1 For Business Owners

    Messy WhatsApp groups – no topic separation, personal/work mix, difficult to track.

    No control over who joins – anyone with a link can enter; NEXACHAT requires owner approval.

    No history search – messages vanish in the scroll; NEXACHAT stores everything persistently.

    Time wasted typing responses – AI smart replies suggest quick answers; AI summaries provide daily digests.

    Lack of team management – owner can see pending requests, approve/deny, and remove members from a simple dashboard.

2.2 For Staff

    Frictionless onboarding – they don’t need to create an account with email/password; they just enter their name and request access.

    Clear separation from personal chats – a dedicated work space.

    Real‑time updates – messages appear instantly, like a modern chat app.

2.3 Technical Challenges Addressed

    Multi-tenancy isolation – each workspace’s data is strictly scoped.

    Scalable real‑time delivery – WebSocket layer with Redis channel layers.

    AI integration without leaking data – AI only receives context from the workspace, not other businesses.

    Operational monitoring – hidden admin dashboard with health checks for database, WebSocket server, AI service, and workspace models.

3. High‑Level Architecture

NEXACHAT follows a monolithic but modular design, using Django as the backend, Django Channels for WebSockets, and a frontend built with Django templates (or optionally React in future). The backend is divided into apps:
text


The system is built around a Workspace – a self-contained container for a business. All chat data, members, and settings belong to a workspace.
4. Core Data Models
4.1 Workspace

Represents a single business or team.

    name – e.g., "Felix Bakery"

    slug – unique URL-friendly identifier (auto-generated from name)

    owner – ForeignKey to User (the business owner who created the workspace)

    created_at

The workspace is the tenant boundary. Every other model is linked to a workspace either directly or indirectly.
4.2 WorkspaceMember

Represents a user's membership in a workspace.

    workspace – ForeignKey to Workspace

    user – ForeignKey to User

    display_name – the name shown in chat (e.g., "Maria")

    approved – Boolean, default False; owner must approve

    joined_at

A user can be a member of multiple workspaces, but each membership is unique (unique_together on workspace and user).
4.3 ChatRoom

In the current design, each workspace has one general chat room. The model supports multiple rooms per workspace in future.

    workspace – ForeignKey to Workspace

    participants – ManyToManyField to User (approved members + owner)

    created_at, updated_at

4.4 Message

    room – ForeignKey to ChatRoom

    sender – ForeignKey to User

    content – Text

    timestamp – auto_now_add

    is_read – Boolean, for read receipts

Validation: The sender must be an approved participant in the room. This ensures only authorized users can post messages.
5. Multi-Tenancy Isolation

Every query is scoped by workspace. This is enforced at the view layer and in the WebSocket consumer:

    When a user visits /<workspace_slug>/, Django fetches the workspace and checks if the user is the owner or an approved member.

    If not approved, the user is redirected to a join request page.

    In the WebSocket consumer, the connection includes a workspace query parameter. The consumer looks up the workspace and verifies the user is an approved member before allowing them to join the workspace’s group.

    All database operations (fetching messages, creating rooms) use the workspace as a filter, preventing data leakage.

6. Onboarding and Approval Flow

    Owner registration – Owner signs up via email/password. The system does not automatically create a workspace; the owner must create one (or it can be auto-created on signup with a default name).

    Workspace creation – Owner provides a business name; a slug is generated and a unique link is formed: nexa.com/<slug>.

    Sharing the link – Owner copies the link and shares it with staff via WhatsApp, SMS, etc.

    Staff join request – Staff opens the link. If not logged in, they are redirected to login/signup. After login, they see a "Request to Join" page where they enter only their display name. No email/password is required if they already have a user account (or they can create one). A WorkspaceMember record is created with approved=False.

    Owner approval – The owner receives a real‑time notification (via WebSocket) in their dashboard. They see pending requests in a list and can approve or decline. On approval, the member is added to the chat room participants and can now access the workspace dashboard.

    Declined – The staff sees a "Request Declined" page. They cannot re-request unless the owner changes the decision (future enhancement).

7. Real-Time Messaging (WebSocket)

Django Channels is used with a Redis channel layer for production-grade scaling. The flow:

    The client opens a WebSocket to ws://host/ws/chat/?workspace=<slug>.

    The consumer extracts the workspace slug from the query string, fetches the workspace, and verifies the user is an approved member.

    If valid, the consumer adds the user to a group named workspace_<workspace_id>.

    When a user sends a message, the consumer saves it to the database and broadcasts to the workspace group.

    All members in that workspace receive the new message in real time.

Key features:

    Typing indicators – client sends typing events, broadcast to workspace.

    Presence – online/offline status broadcast to members.

    Approval notifications – when the owner approves a member, a notification is sent to that user via their personal group.

8. AI Integration

The AI module provides two features:

    Smart Replies – Given the last message, the AI generates 2–3 suggested replies. The client calls an endpoint that sends the message content to the AI service (OpenAI/Anthropic) and returns suggestions.

    Chat Summaries – The system can summarize the entire conversation (or a portion) on request.

The AI service is isolated in apps/ai/services.py. It uses environment variables for the API key and model. All AI calls are stateless; the context passed to the AI is strictly limited to the messages from the requesting workspace, preserving privacy.
9. System Monitoring Dashboard

A hidden admin-only route (/system-monitor/) provides health checks for:

    Database connectivity

    WebSocket server (Redis) status

    AI service availability

    Workspace model integrity

    Workspace URL routing

Each check returns a green/red status. The dashboard auto-refreshes every 30 seconds and displays system stats (total users, workspaces, messages).
10. Security Considerations

    CSRF protection – all forms use Django’s CSRF middleware.

    XSS prevention – messages are sanitised before rendering; Django templates auto-escape content.

    SQL injection – Django ORM parameterises queries.

    Authentication – session-based auth with secure cookies (when DEBUG=False, cookies are secure).

    Multi-tenant isolation – all queries are filtered by workspace; no cross-tenant data is accessible.

    Approval flow – prevents unauthorised users from joining a workspace even if they have the link.

    Environment variables – secrets (API keys, SECRET_KEY) are not hardcoded.

11. Tech Stack Summary


    Database: PostgreSQL (production) / SQLite (development)/ mysql


    AI: OpenAI/Anthropic API (configurable)

    stack : fastapi, react+typscript+tailwind (monolitic development) or if that doesnt work then you can seperate frontend from backend

    Deployment: Render/Railway (prepared)

12. How It All Fits Together

    A bakery owner signs up, creates a workspace named "Felix Bakery", gets nexa.com/felixbakery.

    Owner shares the link via WhatsApp.

    Staff member opens the link, logs in, requests to join with name "Maria".

    Owner sees a pending request in their dashboard and clicks "Approve".

    Maria is now a WorkspaceMember with approved=True. She sees the workspace chat dashboard.

    The chat dashboard opens a WebSocket to /ws/chat/?workspace=felixbakery.

    Maria types a message. The WebSocket consumer saves it to the Message table and broadcasts to all members of the workspace.

    Another staff member, John, receives the message instantly.

    The owner can ask the AI for smart reply suggestions or a conversation summary.

    An admin can visit /system-monitor/ to verify all components are healthy.

This architecture is designed to be simple, secure, and extensible. It solves a concrete problem for non-technical business owners while providing a solid foundation for future growth (e.g., group channels, file sharing, mobile apps). The workspace-as-a-link concept reduces onboarding friction and creates a natural product differentiation.
