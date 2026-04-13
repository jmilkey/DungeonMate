from datetime import datetime, timezone

from .schemas import (
    CampaignSummary,
    CreateCampaignRequest,
    CreateSessionRequest,
    SessionAudioUploadResponse,
    SessionSummary,
)


campaigns: list[CampaignSummary] = [
    CampaignSummary(
        id="campaign-1",
        name="Shadows of Brindlewatch",
        system="D&D 5e",
        description="A frontier horror campaign with a chapel crypt beneath the town.",
        updated_at=datetime.now(timezone.utc),
    )
]

sessions: list[SessionSummary] = [
    SessionSummary(
        id="session-1",
        campaign_id="campaign-1",
        title="Session 6",
        status="complete",
        started_at=datetime.now(timezone.utc),
        short_summary="The party uncovered the crypt entrance and struck a bargain with Baron Vale.",
    )
]

audio_uploads: list[SessionAudioUploadResponse] = []


def list_campaigns() -> list[CampaignSummary]:
    return campaigns


def get_campaign(campaign_id: str) -> CampaignSummary | None:
    return next((campaign for campaign in campaigns if campaign.id == campaign_id), None)


def create_campaign(payload: CreateCampaignRequest) -> CampaignSummary:
    campaign = CampaignSummary(
        id=f"campaign-{len(campaigns) + 1}",
        name=payload.name,
        system=payload.system,
        description=payload.description,
        updated_at=datetime.now(timezone.utc),
    )
    campaigns.append(campaign)
    return campaign


def list_sessions(campaign_id: str | None = None) -> list[SessionSummary]:
    if not campaign_id:
        return sessions
    return [session for session in sessions if session.campaign_id == campaign_id]


def create_session(payload: CreateSessionRequest) -> SessionSummary:
    session = SessionSummary(
        id=f"session-{len(sessions) + 1}",
        campaign_id=payload.campaign_id,
        title=payload.title,
        status="recording",
        started_at=datetime.now(timezone.utc),
    )
    sessions.insert(0, session)
    return session


def store_audio_upload(
    session_id: str, filename: str, content_type: str, size_bytes: int
) -> SessionAudioUploadResponse:
    upload = SessionAudioUploadResponse(
        session_id=session_id,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        uploaded_at=datetime.now(timezone.utc),
    )
    audio_uploads.append(upload)
    return upload
