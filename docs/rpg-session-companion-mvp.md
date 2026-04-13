# RPG Session Companion MVP

## Product Summary

This app helps tabletop RPG players and GMs stay present during a session by recording table audio, transcribing the conversation, and generating structured notes automatically. The primary device target is phone and tablet, with the first release optimized for one-tap session capture and fast post-session recall.

The core promise for the MVP is simple:

"Press record, play the game, and get a useful session recap without asking anyone to take notes."

## Problem

Tabletop RPG groups often lose important details because players are focused on the table, not documentation. Notes are incomplete, unevenly distributed across players, and difficult to maintain over a long campaign. GMs often spend extra time after sessions reconstructing events, NPC names, quest updates, and combat outcomes.

## Users

### Primary users

- Game Masters running ongoing campaigns
- Players who want reliable reminders between sessions

### Secondary users

- Groups playing online and in person
- Actual play groups that want searchable transcripts and structured recaps

## MVP Goals

- Reduce or eliminate manual note-taking during sessions
- Produce a useful session recap within minutes of the session ending
- Preserve campaign memory across sessions
- Support phone and tablet use with a simple, low-friction recording flow
- Provide lightweight near-real-time value without requiring perfect live accuracy

## Non-Goals For MVP

- Perfect mechanical tracking of HP, initiative, spell slots, or inventory
- Fully autonomous rules adjudication
- Desktop-first workflows
- In-app virtual tabletop features
- Full offline AI inference on device

## Product Principles

- Recording must be easy enough to start in under 10 seconds
- Generated output must favor usefulness over completeness
- Real-time features should be informative, not distracting
- The app should remember corrections such as renamed NPCs and custom terminology
- The GM should be able to review and fix extracted information quickly

## MVP Feature Set

### 1. Session recording

- Start, pause, resume, and end a session recording from a phone or tablet
- Store audio locally first, then upload in chunks when connectivity is available
- Show recording duration and upload/transcription health

### 2. Live transcript

- Display a rolling transcript during the session
- Stream transcript updates every few seconds
- Mark uncertain segments when speech quality is low

### 3. Live session assist

- Generate short rolling summaries every 30 to 60 seconds
- Surface "important moments" such as:
  - new NPC introduced
  - location discovered
  - quest accepted or advanced
  - item or reward mentioned
  - combat likely started or ended
- Keep this lightweight to avoid overwhelming players during play

### 4. End-of-session recap

- Generate a polished session summary after recording ends
- Produce:
  - short summary
  - detailed summary
  - chronological timeline
  - NPCs mentioned
  - locations visited
  - quests updated
  - loot or rewards mentioned
  - unresolved hooks or mysteries
  - combat recap

### 5. Campaign memory

- Persist entities across sessions:
  - campaigns
  - sessions
  - characters
  - NPCs
  - locations
  - quests
  - items
- Allow search across prior session summaries and transcripts
- Allow users to merge duplicates and rename entities

### 6. Review and correction

- Let the GM edit generated summaries
- Let the GM merge duplicate NPCs and locations
- Let the GM confirm or reject extracted quest updates
- Save those corrections so future sessions improve

## Core User Flows

### Flow 1: Start a session

1. User opens the app and selects a campaign.
2. User taps "Start Session."
3. App begins recording locally and starts chunk upload/transcription.
4. Live transcript appears within a short delay.

### Flow 2: Use live assist during play

1. User glances at the session screen occasionally.
2. App displays transcript updates and a rolling summary.
3. App highlights likely events such as a new NPC or combat transition.
4. User continues playing without needing to type.

### Flow 3: End session and review notes

1. User taps "End Session."
2. Backend runs a higher-quality final synthesis over the full transcript.
3. User receives a recap view within a few minutes.
4. User edits names, merges duplicates, and confirms quest changes.

### Flow 4: Catch up before next session

1. User opens a campaign before play.
2. App shows "Last session recap" and open quests.
3. User reviews campaign memory in under 2 minutes.

## Information Architecture

### Main screens

- Campaign list
- Campaign detail
- Session recording screen
- Live transcript and live assist panel
- Session recap screen
- Campaign memory screen
- Entity detail screens for NPCs, locations, and quests

## Recommended Technical Architecture

### Frontend

- React Native with Expo
- TypeScript
- Local storage for session state and upload recovery
- WebSocket connection for live transcript and summary updates

### Backend

- FastAPI or NestJS
- WebSocket support for real-time updates
- Background job workers for transcription post-processing and summary generation
- REST API for campaign, session, and entity management

### Data and infrastructure

- Postgres for structured campaign data
- S3-compatible object storage for audio files and transcript artifacts
- Redis or a job queue for background processing

### AI pipeline

- Streaming speech-to-text for live transcript
- Diarization if supported by the chosen transcription provider
- LLM pass for rolling summaries during play
- Higher-cost, higher-quality LLM pass for end-of-session synthesis
- Structured extraction step that converts transcript text into entities and events

## Why this architecture

- React Native and Expo provide fast cross-platform delivery for iPhone, iPad, and Android
- The backend can offload expensive transcription and summarization work from the device
- A split between live processing and final synthesis keeps costs manageable and improves reliability
- Structured data storage makes campaign memory and correction workflows possible

## Domain Model

### Campaign

- id
- name
- system
- description
- created_at

### Session

- id
- campaign_id
- title
- started_at
- ended_at
- audio_status
- transcript_status
- summary_status
- short_summary
- detailed_summary

### TranscriptSegment

- id
- session_id
- started_at_ms
- ended_at_ms
- speaker_label
- text
- confidence

### Character

- id
- campaign_id
- name
- player_name
- notes

### NPC

- id
- campaign_id
- canonical_name
- aliases
- description
- status
- notes

### Location

- id
- campaign_id
- canonical_name
- aliases
- description
- notes

### Quest

- id
- campaign_id
- title
- status
- description
- last_updated_session_id

### Item

- id
- campaign_id
- name
- description
- owner

### SessionEvent

- id
- session_id
- event_type
- title
- description
- source_segment_ids
- confidence

## Event Types For MVP

- npc_introduced
- location_discovered
- quest_started
- quest_updated
- quest_completed
- item_gained
- combat_started
- combat_ended
- clue_revealed
- relationship_changed

## AI Output Contracts

The AI layer should not only produce prose. It should also return structured JSON that can populate the domain model.

### Rolling summary output

- summary_text
- open_threads
- recent_entities
- recent_events
- confidence_notes

### Final session synthesis output

- short_summary
- detailed_summary
- timeline
- extracted_npcs
- extracted_locations
- extracted_quests
- extracted_items
- extracted_events
- unresolved_threads
- follow_up_questions_for_review

## Accuracy Strategy

To keep the app useful even when transcription is imperfect:

- treat live output as draft quality
- run a more careful final synthesis at session end
- allow quick human correction of names and entity merges
- maintain per-campaign custom vocabulary such as character names and fantasy terms
- keep source transcript references for extracted entities and events

## Privacy And Consent

Recording people at the table has legal and social implications. The app should:

- require explicit confirmation that all participants consent to recording
- clearly indicate when recording is active
- allow campaign-level retention settings
- support deletion of audio and transcripts

## Risks

### Product risks

- Users may expect exact mechanical tracking from conversational audio
- Real-time summaries may be too noisy if shown too aggressively
- Review workflows may become tedious if extraction quality is low

### Technical risks

- Crosstalk and ambient noise reduce transcription quality
- Fantasy names and invented terminology are often misheard
- Long sessions can increase cost and latency
- Speaker diarization may be unreliable in casual tabletop conditions

## Success Metrics

- Time to start recording
- Percentage of sessions that produce a usable recap
- Time from session end to recap availability
- Number of manual note-taking actions replaced by the app
- Number of review corrections required per session
- Percentage of users returning to read the prior session recap

## Phase Plan

### Phase 1: MVP

- Campaign management
- Session recording
- Live transcript
- Rolling summary
- End-of-session recap
- Campaign memory for NPCs, locations, quests, and items
- Review and correction tools

### Phase 2: Better live assist

- Improved diarization
- Session timeline during play
- Better combat transition detection
- User-defined glossary and name pronunciation hints

### Phase 3: System-aware extraction

- D&D and Pathfinder presets
- Better combat and resource summaries
- Character-specific memory views
- GM-facing prep suggestions based on open threads

### Phase 4: Collaboration and ecosystem

- Shared campaign access for all players
- Export to PDF or markdown
- Integrations with virtual tabletops and campaign managers

## Suggested Build Order

1. Set up mobile shell, authentication, and campaign/session models.
2. Implement local recording and chunk upload.
3. Add backend transcription ingestion and transcript streaming.
4. Add rolling summary generation.
5. Add final synthesis and structured extraction.
6. Add recap review and entity correction workflows.
7. Add campaign memory search and recap history.

## Recommendation For First Implementation Sprint

The first sprint should aim to prove the core loop:

- create a campaign
- record a short session
- upload audio
- generate transcript
- generate a useful recap

If that loop works, the rest of the product becomes refinement rather than invention.
