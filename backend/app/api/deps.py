from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import AuthContext, get_auth_context_from_header
from app.models.user import Profile
from app.services.auth_service import AuthService


def get_auth_context(
    auth: AuthContext = Depends(get_auth_context_from_header),
) -> AuthContext:
    return auth


def get_current_profile(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(get_auth_context),
) -> Profile:
    return AuthService.require_profile(db, auth)
