# Infrastructure Log

## 2026-03-20

### Framework
- Chosen: Next.js full-stack app in JavaScript
- Why: one codebase, fast iteration, built-in routing and API handlers
- Tradeoff: slightly heavier than the previous static server, but much faster to extend

### Runtime
- Chosen: Node.js local development
- Why: already present in the workspace and aligns with the requested stack

### Auth
- Chosen: lightweight local single-user auth with signed cookie sessions
- Why: avoids Auth0 and keeps MVP runnable locally
- Tradeoff: not production-grade multi-user auth

### Auth Update
- Added: optional Auth0 integration for official social login
- Why: enables LinkedIn login through Auth0 Universal Login instead of handling credentials in-app
- Tradeoff: requires external tenant/app configuration and a LinkedIn social connection in Auth0 before it becomes live

### Storage
- Chosen: encrypted local file store instead of Kuzu for the first working pass
- Why: fastest path to a working local MVP in this environment with zero extra native database setup
- Tradeoff: graph traversal is application-managed rather than database-native
- Follow-up: Kuzu remains a strong future upgrade path if we want embedded graph queries later

### Encryption
- Chosen: AES-256-GCM for encrypted state and raw import payload storage
- Why: satisfies local-first encrypted-at-rest requirement with built-in Node crypto
- Tradeoff: secret is stored locally on the same machine, which is acceptable for MVP but not ideal for hardened security

### LinkedIn Strategy
- Chosen: official API-first boundary plus user-consented assisted import fallback
- Why: aligns with compliance goals while still making the product usable
- Tradeoff: no risky automation or raw credential scraping, so deep LinkedIn data access remains constrained

### Safe Model Pivot - 2026-03-21
- Observation: Auth0 login success does not automatically produce rich LinkedIn graph data
- Decision: redesign the product around a safer model instead of trying to force deep automatic LinkedIn extraction
- New safe model:
  - Auth0 is used only as a LinkedIn connection and identity boundary
  - PAMOJA itself is no longer gated behind app login
  - deeper analysis should come from user-provided exports / JSON imports
  - official provider data should be treated as limited and additive, not as the full graph source
- Why:
  - lowers account/platform risk
  - keeps the product aligned with platform-safe behavior
  - makes data provenance clearer for future users and reviewers
- Tradeoff:
  - less automatic graph richness
  - more reliance on guided first-party imports

### Direct OAuth Pivot - 2026-03-21
- Observation: Auth0 connection-token exchange introduced hidden constraints around refresh tokens and made it hard to inspect what the app had actually retrieved
- Decision: make direct LinkedIn OAuth the primary official connection path
- New architecture:
  - PAMOJA initiates LinkedIn OAuth itself
  - the LinkedIn access token is stored only in encrypted local server-side storage
  - provider snapshots are written into the local vault for inspection
  - Auth0 can remain in the codebase as a fallback, but is no longer required for the main flow
- Why:
  - removes the extra token-exchange indirection
  - makes provider retrieval easier to reason about
  - keeps the app on the official OAuth path while reducing hidden dependencies
- Tradeoff:
  - requires a direct LinkedIn developer app setup
  - still does not guarantee broad LinkedIn graph access beyond what official scopes allow

### Development Narrative - 2026-03-21
- Confirmed Auth0 tenant/app setup reached the authorization screen successfully
- Confirmed the mismatch between successful provider authorization and missing network ingestion
- Changed product thinking from "LinkedIn login should yield full network data" to "LinkedIn login proves identity and permitted provider data only"
- Removed the app-login gate from active use so the workspace is immediately usable
- Added a dedicated LinkedIn profile/status endpoint and UI readout
- Narrowed the proxy boundary to `/auth/*` after a boot loop caused by intercepting the full app surface
- Validated the repaired endpoints:
  - `/api/auth/session`
  - `/api/network`
  - `/api/linkedin/profile`
- Added a dedicated safe-strategy document to preserve the reasoning for this pivot
- Reworked the main workspace around a safe-import wizard so the product now guides the user through:
  - safe provider connection
  - explicit first-party data import
  - graph exploration
- Moved the free explore canvas into the upper-right stage of the app frame so the primary visual surface leads the experience instead of appearing below the import controls
- Kept relationship weighting, provider retrieval status, and import controls in the left rail to make the safe model easier to understand at a glance
- Re-ran the evaluation suite after the layout changes and confirmed tests plus production build still pass
- Hardened the LinkedIn import path after a user import produced a near-empty graph state:
  - sparse and stringly-typed records are now normalized more defensively
  - auto-generated edges are built from shared organization, cluster, time, and geography signals
  - the graph renderer now tolerates partial scores and missing years without destabilizing
  - the UI now tells the user when an import succeeded technically but is too small to produce a rich network view
- Added an inspectability layer after it became unclear what, if anything, was actually coming back from Auth0/LinkedIn:
  - a local retrieval vault now stores captured provider snapshots and raw imports
  - a bottom-left system console now shows recent background events verbosely
  - the product can now answer "what did we really retrieve?" from inside the UI instead of forcing terminal inspection
- Fixed a direct OAuth callback flaw caused by mixing `localhost` and `127.0.0.1` during the LinkedIn round-trip:
  - pending OAuth state is now stored server-side instead of in a host-bound cookie
  - callback failures are logged with explicit reasons
  - the app now surfaces LinkedIn callback success/error messages in the main UI
- After the direct connection started succeeding, corrected two follow-up issues:
  - token expiry timestamps are now treated as milliseconds in the UI instead of being multiplied again
  - refresh diagnostics now syncs the captured LinkedIn profile into PAMOJA state so the platform reflects the real connected identity instead of only showing the legacy sample import

### AI Layer
- Chosen: heuristic local insight layer with optional OpenAI Responses API fallback when `OPENAI_API_KEY` is set
- Why: ensures the product works locally even without cloud credentials
- Tradeoff: narrative quality is lower without an API key

### Visualization
- Chosen: custom canvas-based pseudo-3D graph
- Why: light, fast, mobile-aware, no extra graph dependency
- Tradeoff: less feature-rich than a dedicated visualization framework, but easier to keep fluid

### Demo Data
- Chosen: realistic synthetic founder/operator/investor network
- Why: allows end-to-end evaluation even when real LinkedIn data is not available

### Iteration Notes
- Pass 1: fixed dropped graph edges in demo persistence so bridge analysis is backed by actual graph structure
- Pass 2: improved graph interaction stability and added persistence tests for import, weights, and conversation memory
- Pass 3: added official LinkedIn OAuth route scaffolding and changed weight editing from eager writes to explicit save
- Pass 4: added environment scaffolding and a reusable assisted-import sample for future runs
