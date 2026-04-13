# DungeonMate API

This FastAPI service is the starter backend for campaign, session, transcript, and recap workflows.

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Run `uvicorn app.main:app --reload`.

## Starter endpoints

- `GET /health`
- `GET /campaigns`
- `POST /campaigns`
- `GET /sessions`
- `POST /sessions`
- `POST /sessions/{session_id}/audio`
