# PAMOJA MVP Scope

## Goal
Build a working MVP for recurring, high-context communities where:

1. An organizer creates an event and uploads attendees.
2. The system creates draft Profile Agents for each attendee.
3. An attendee claims their Profile Agent and confirms key fields.
4. The attendee asks, "Who should I meet at this event?"
5. The system returns 3 ranked recommendations with reasons.
6. After the event, the attendee debriefs who they met.
7. The Profile Agent updates memory for future events.

## In Scope
- Organizer event creation
- CSV attendee import
- Draft Profile Agent creation from uploaded attendee rows
- Profile claim and profile editing flow
- One Event Agent per event
- One recommendation query: "Who should I meet at this event?"
- Ranked recommendations with concise reasons
- Post-event debrief and memory writeback
- Lightweight event and recommendation analytics
- Seeded demo data for local testing

## Out Of Scope
- Real-time messaging
- Social feed or full directory explorer
- Background autonomous agents
- Cross-community roaming
- Rich graph visualizations
- Multi-agent negotiation
- Production auth and permissions hardening
- Production database and deployment automation

## MVP Success Criteria
- A user can claim their Profile Agent and receive 3 recommendations in under 90 seconds.
- At least one recommendation can be marked useful during debrief.
- Recommendations should feel better than a static attendee list because they use profile goals, interests, and event context.

## Build Notes
- Keep architecture modular so a real Postgres/vector stack can replace local storage later.
- Prioritize recommendation quality, onboarding speed, and memory writeback over visual polish.
- Use structured filtering first and only add more advanced ranking once the base loop works consistently.
