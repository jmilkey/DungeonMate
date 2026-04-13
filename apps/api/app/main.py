import sys
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

VENDOR_PATH = Path(__file__).resolve().parent.parent / "vendor"
if VENDOR_PATH.exists():
    sys.path.insert(0, str(VENDOR_PATH))

from .schemas import (
    CampaignListResponse,
    CampaignSummary,
    CreateCampaignRequest,
    CreateSessionRequest,
    HealthResponse,
    SessionListResponse,
    SessionAudioUploadResponse,
    SessionSummary,
)
from .store import (
    create_campaign,
    create_session,
    get_campaign,
    list_campaigns,
    list_sessions,
    store_audio_upload,
)

app = FastAPI(
    title="DungeonMate API",
    version="0.1.0",
    description="Backend services for mobile RPG session capture, transcript processing, and recap generation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(timestamp=datetime.now(timezone.utc))


@app.get("/campaigns", response_model=CampaignListResponse)
def get_campaigns() -> CampaignListResponse:
    return CampaignListResponse(items=list_campaigns())


@app.post("/campaigns", response_model=CampaignSummary, status_code=201)
def post_campaign(payload: CreateCampaignRequest) -> CampaignSummary:
    return create_campaign(payload)


@app.get("/sessions", response_model=SessionListResponse)
def get_sessions(campaign_id: str | None = Query(default=None)) -> SessionListResponse:
    return SessionListResponse(items=list_sessions(campaign_id=campaign_id))


@app.post("/sessions", response_model=SessionSummary, status_code=201)
def post_session(payload: CreateSessionRequest) -> SessionSummary:
    if get_campaign(payload.campaign_id) is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return create_session(payload)


@app.post("/sessions/{session_id}/audio", response_model=SessionAudioUploadResponse, status_code=201)
async def upload_session_audio(
    session_id: str, file: UploadFile = File(...)
) -> SessionAudioUploadResponse:
    matching_session = next((session for session in list_sessions() if session.id == session_id), None)
    if matching_session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    contents = await file.read()
    return store_audio_upload(
        session_id=session_id,
        filename=file.filename or "session-audio",
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
    )
