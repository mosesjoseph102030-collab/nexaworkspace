from fastapi import HTTPException, status


class NexaChatException(HTTPException):
    pass


class WorkspaceNotFound(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
            headers={"X-Error-Code": "WORKSPACE_NOT_FOUND"},
        )


class WorkspaceSlugTaken(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="Workspace slug already taken",
            headers={"X-Error-Code": "SLUG_TAKEN"},
        )


class ReservedSlug(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This name is reserved and cannot be used",
            headers={"X-Error-Code": "RESERVED_SLUG"},
        )


class NotWorkspaceMember(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
            headers={"X-Error-Code": "NOT_MEMBER"},
        )


class MembershipPending(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your membership request is pending approval",
            headers={"X-Error-Code": "MEMBERSHIP_PENDING"},
        )


class MembershipDeclined(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your membership request was declined",
            headers={"X-Error-Code": "MEMBERSHIP_DECLINED"},
        )


class NotWorkspaceOwner(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can perform this action",
            headers={"X-Error-Code": "NOT_OWNER"},
        )


class DuplicateMembership(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already requested to join this workspace",
            headers={"X-Error-Code": "DUPLICATE_MEMBERSHIP"},
        )


class UserAlreadyExists(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
            headers={"X-Error-Code": "USER_EXISTS"},
        )


class InvalidCredentials(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "INVALID_CREDENTIALS"},
        )


class TokenExpired(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "TOKEN_EXPIRED"},
        )


class InvalidToken(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer", "X-Error-Code": "INVALID_TOKEN"},
        )


class RateLimitExceeded(NexaChatException):
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"X-Error-Code": "RATE_LIMITED"},
        )


class MessageNotFound(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
            headers={"X-Error-Code": "MESSAGE_NOT_FOUND"},
        )


class CannotEditMessage(NexaChatException):
    def __init__(self, reason: str = "Cannot edit this message"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=reason,
            headers={"X-Error-Code": "CANNOT_EDIT"},
        )


class AIServiceUnavailable(NexaChatException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is temporarily unavailable",
            headers={"X-Error-Code": "AI_UNAVAILABLE"},
        )
