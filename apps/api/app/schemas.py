from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "dungeonmate-api"
    timestamp: datetime


class CampaignSummary(BaseModel):
    id: str
    name: str
    system: str
    description: str
    updated_at: datetime


class CreateCampaignRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    system: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=500)


class SessionSummary(BaseModel):
    id: str
    campaign_id: str
    title: str
    status: Literal["idle", "recording", "processing", "complete"]
    started_at: datetime
    ended_at: datetime | None = None
    short_summary: str | None = None


class CreateSessionRequest(BaseModel):
    campaign_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=100)


class SessionListResponse(BaseModel):
    items: list[SessionSummary]


class CampaignListResponse(BaseModel):
    items: list[CampaignSummary]


class SessionAudioUploadResponse(BaseModel):
    session_id: str
    filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime
