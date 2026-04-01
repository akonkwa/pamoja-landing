# PAMOJA MVP

Local-first LinkedIn network intelligence MVP built as a full-stack Next.js app.

## What it does

- Demo mode with a realistic synthetic founder/operator/investor network
- Direct LinkedIn OAuth connection boundary with encrypted local token storage
- User-consented LinkedIn JSON import boundary
- Encrypted local storage for imported payloads and derived network state
- Fast pseudo-3D graph canvas focused on people over time
- Auto-generated story pane for hidden clusters and bridge people
- Conversational insight panel with persistent memory
- Retrieval vault and verbose system console for inspecting what was actually captured

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Easiest way to run

From Terminal:

```bash
cd /Users/akonkwamubagwa/Documents/Playground
npm run pamoja
```

Or double-click:

[run-pamoja.command](/Users/akonkwamubagwa/Documents/Playground/run-pamoja.command)

That script:
- goes to the right folder
- clears the Next cache
- installs packages if needed
- starts the app

For optional AI and LinkedIn OAuth config, copy `.env.example` to `.env.local` and fill in the values you have available.

## Direct LinkedIn OAuth

This app now supports direct LinkedIn OAuth as the primary safe official connection path.
The current product direction is:

- use direct provider OAuth to connect LinkedIn safely
- store the resulting access token only in encrypted local server-side storage
- use provider-approved profile/session data where available
- use user-provided exports or JSON imports for deeper historical/network analysis
- avoid scraping and unofficial automation

Set these in `.env.local`:

```bash
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://127.0.0.1:3000/api/linkedin/official/callback
LINKEDIN_SCOPE=openid profile email
```

Then in LinkedIn Developer settings:

1. Create or use a LinkedIn developer app.
2. Add `http://127.0.0.1:3000/api/linkedin/official/callback` as an authorized redirect URI.
3. Copy the LinkedIn client ID and client secret into `.env.local`.

After that, use the direct LinkedIn connection button inside the app.

## First launch flow

1. Open the app directly.
2. Choose `Load Demo Mode` for the full seeded experience, or paste your own JSON import.
3. Optionally connect LinkedIn directly through provider OAuth for safe identity/session retrieval.
4. Explore the graph, adjust relationship weights, and ask the insight agent about hidden clusters or bridge people.

## Import format

A sample assisted-import payload lives at [docs/sample_linkedin_import.json](/Users/akonkwamubagwa/Documents/Playground/docs/sample_linkedin_import.json).

Minimum shape:

```json
{
  "profile": { "name": "LinkedIn User" },
  "people": [
    {
      "name": "Contact Name",
      "firstSeenYear": 2023,
      "cluster": "Imported Cluster",
      "organization": "Organization Name"
    }
  ]
}
```

## Evaluation

```bash
npm test
npm run evaluate
```

`npm run evaluate` runs the test suite and a production build.

## LinkedIn note

This MVP now supports a safer LinkedIn strategy:

- direct LinkedIn OAuth with encrypted local token storage
- user-consented assisted import for first-party history/network data
- no raw credential scraping
- no background automation
- no promise of full LinkedIn graph access through official provider login alone

For the full rationale, see [docs/linkedin_safe_strategy.md](/Users/akonkwamubagwa/Documents/Playground/docs/linkedin_safe_strategy.md).
