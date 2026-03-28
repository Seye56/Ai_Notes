from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_auth_context, get_current_profile
from app.core.database import get_db
from app.core.security import AuthContext
from app.models.user import Profile
from app.schemas.auth import AuthBootstrapResponse
from app.schemas.user import ProfileRead, ProfileUpdate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/bootstrap", response_model=AuthBootstrapResponse)
def bootstrap_authenticated_user(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(get_auth_context),
) -> AuthBootstrapResponse:
    profile = AuthService.bootstrap_profile(db, auth)
    return AuthBootstrapResponse(
        access_token_subject=auth.user_id,
        profile=ProfileRead.model_validate(profile),
    )


@router.get("/me", response_model=ProfileRead)
def get_me(current_profile: Profile = Depends(get_current_profile)) -> ProfileRead:
    return ProfileRead.model_validate(current_profile)


@router.patch("/me", response_model=ProfileRead)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> ProfileRead:
    profile = AuthService.update_profile(db, current_profile, payload)
    return ProfileRead.model_validate(profile)
