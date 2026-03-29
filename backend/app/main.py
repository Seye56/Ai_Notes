from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.groups import router as groups_router
from app.api.routes.notes import router as notes_router
from app.api.routes.quizzes import router as quizzes_router
from app.api.routes.speech import router as speech_router
from app.api.routes.summaries import router as summaries_router
from app.api.routes.translations import router as translations_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models import AudioFile, Group, GroupMember, GroupNoteEvent, GroupPresence, Note, Profile, Quiz, Summary, Translation


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_create_tables and engine is not None:
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.project_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(groups_router, prefix=settings.api_v1_prefix)
app.include_router(notes_router, prefix=settings.api_v1_prefix)
app.include_router(quizzes_router, prefix=settings.api_v1_prefix)
app.include_router(speech_router, prefix=settings.api_v1_prefix)
app.include_router(summaries_router, prefix=settings.api_v1_prefix)
app.include_router(translations_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}
