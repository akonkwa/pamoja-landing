# Umoja Agentic Social Universe

Umoja is an event-centered social intelligence app where every profile is an agent and every event is an agent. It combines a neon pixel-art network graph, AI-assisted prompting, agent-to-agent pairing, Telegram-linked profile agents, and a lightweight event simulation loop.

Live app:
- [https://pamoja-app-production.up.railway.app](https://pamoja-app-production.up.railway.app)

Documentation:
- [https://pamoja-app-production.up.railway.app/docs](https://pamoja-app-production.up.railway.app/docs)

## Core Features

- 30 seeded demo agents across founder, operator, and explorer clusters
- Event agents that represent `has attended`, `attending`, and `will attend` relationships
- Agent-specific pairing with visible graph links
- Background simulation via `Advance Day`
- AI-backed prompt box with retrieval over profiles, events, memory, and recommendations
- Telegram bot connection for profile agents
- OpenRouter to OpenAI failover for model calls

## Tech Stack

- Next.js App Router
- React
- Local JSON persistence in `data/db.json`
- Railway for deployment
- Telegram Bot API
- OpenAI / OpenRouter for model responses

## Local Setup

Requirements:
- Node.js 22+
- npm

Install and run:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env.local` and set what you need.

Common variables:

```bash
APP_BASE_URL=http://localhost:3000

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini

OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=pamoja_agent_bot

LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=...
LINKEDIN_SCOPE=openid profile email
```

Notes:
- Model routing prefers the active provider and can fail over if one provider is unavailable.
- Telegram features require the bot token and username.
- LinkedIn configuration is optional and only needed if you are using the LinkedIn auth flow.

## Usage

Suggested demo flow:

1. Open the app and select `PAMOJA Universe Preview`.
2. Choose a profile agent from the right panel.
3. Click `Run Pairing` to pair only that selected agent.
4. Ask questions in the prompt box about matches, memory, or event context.
5. Use `Advance Day` to simulate broader background work across the event.
6. Optionally connect the selected profile to Telegram and use `/help`, `/pair`, `/advance`, or natural-language prompts.

## Architecture

High-level flow:

1. The UI loads dashboard state from `/api/dashboard`.
2. Actions such as pairing, debriefing, simulation, and Telegram connection mutate local app state through API routes.
3. Recommendation state is stored in `db.recommendations`.
4. Agent replies are generated from profile state plus retrieved memory, event, and recommendation context.
5. Telegram messages hit `/api/telegram/webhook`, which can trigger pairing, status, help, and simulation actions.

Key folders:

- `app/`: Next.js routes and API endpoints
- `components/`: UI and graph workspace
- `lib/`: app logic, recommendations, Telegram, model routing, storage
- `data/`: local persisted state
- `public/`: static assets and alternate prototypes

## Testing

Run:

```bash
npm test
npm run build
```

## Current Limitations

- Persistence is still local-file based, not production database backed
- The seeded demo universe is intentionally synthetic
- Telegram behavior depends on Railway deploy health and webhook health
- The app includes legacy and experimental files in the broader workspace
- LinkedIn integration is partial and should be treated as optional
- Autonomous behavior is still guided workflows plus model calls, not fully independent long-running agents

## Submission Links

- Public repo: [https://github.com/akonkwa/pamoja-landing](https://github.com/akonkwa/pamoja-landing)
- Live app: [https://pamoja-app-production.up.railway.app](https://pamoja-app-production.up.railway.app)
- Documentation page: [https://pamoja-app-production.up.railway.app/docs](https://pamoja-app-production.up.railway.app/docs)

## Optional White Paper

Not included by default. If needed, pair the submission with a short concept note or one-pager from the `docs/` folder.
