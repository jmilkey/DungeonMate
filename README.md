# DungeonMate

DungeonMate is a mobile-first RPG session companion that records table audio, streams transcription, and turns sessions into useful campaign notes.

## Workspace layout

- `apps/mobile`: Expo + React Native client for phone and tablet
- `apps/api`: FastAPI backend for health, campaign, and session services
- `docs`: product and architecture notes

## Quick start

### Mobile app

1. Install Node.js 20 or newer.
2. Run `npm install` from `apps/mobile`.
3. Run `npm run start`.

### API

1. Create a virtual environment inside `apps/api`.
2. Install dependencies with `pip install -r requirements.txt`.
3. Run `uvicorn app.main:app --reload` from `apps/api`.

## Next milestones

- Replace mock session state with real audio capture and chunk upload
- Connect the mobile app to the API
- Add streaming transcript infrastructure
- Add summary generation and persistent storage
