# LinkedIn Safe Strategy

## Purpose

This document captures the safer product direction for PAMOJA's LinkedIn ingestion path.
The goal is to learn from a user's LinkedIn presence without using scraping, browser automation,
credential handling, or any workflow that could put the user's account at risk.

## Safe Product Principle

PAMOJA should only use LinkedIn data through one of these approved paths:

1. Official OAuth / identity connection
2. Official APIs and approved tokens when available
3. User-provided exports or manual first-party uploads
4. User-authored notes or confirmations inside PAMOJA

PAMOJA should not rely on:

- raw credential collection
- automated page scraping
- background crawling
- unofficial browser automation
- bulk extraction of connection graphs

## Current Safe MVP Model

### 1. Identity and consent
Use Auth0 only as a LinkedIn connection boundary.

What this means:
- the app itself does not need a login gate for normal exploration
- Auth0 is used only when the user wants to connect LinkedIn
- the user explicitly initiates the LinkedIn connection

### 2. Approved data retrieval
When Auth0 is connected, PAMOJA should first read only what is explicitly available through the approved identity session and any available connection token.

Examples of safe early-stage fields:
- name
- email, if returned
- profile picture, if returned
- provider metadata
- token presence / token expiry metadata

This is useful as proof that the connection works, but it is not a full LinkedIn network import.

### 3. User-provided historical enrichment
Because official LinkedIn access is limited, the main enrichment path should be user-provided data.

Preferred sources:
- LinkedIn exports provided by the user
- profile JSON assembled from first-party user data
- manually uploaded CSV / JSON files
- user-confirmed role and timeline data

### 4. Local-first processing
All imported material should be normalized and stored locally first.

PAMOJA should:
- store raw payloads locally in encrypted form
- build normalized people / organizations / timeline structures locally
- derive clusters and bridge people locally
- preserve a clear distinction between raw imported facts and inferred insights

## Product Implications

### What PAMOJA can safely promise now

- connect LinkedIn through Auth0
- verify a live LinkedIn/Auth0 session
- show what provider-level profile data is available
- ingest user-provided LinkedIn export data
- generate network insight from user-provided or seeded data

### What PAMOJA should not promise yet

- full automatic LinkedIn connection graph retrieval
- access to LinkedIn messages
- access to the user's full network history from LinkedIn alone
- hidden data collection in the background

## Recommended UX Copy

Instead of saying:
"Connect LinkedIn and we will analyze your whole network"

Prefer:
"Connect LinkedIn to verify identity and retrieve any approved profile data. For deeper history and network analysis, upload your LinkedIn export or your own first-party data."

## Recommended Build Sequence

### Phase 1
- confirm Auth0 LinkedIn connection works
- display returned profile/session metadata clearly
- label what data is available vs unavailable

### Phase 2
- support user-provided LinkedIn export upload
- normalize export data into PAMOJA graph entities
- generate timeline, clusters, and bridge analysis from that data

### Phase 3
- add guided import helpers that help the user structure safe first-party data
- merge provider profile data with uploaded historical data

## Risk Posture

This strategy optimizes for:
- low account risk
- better platform compliance
- explicit user consent
- transparent data provenance

It trades off:
- depth of automatic retrieval
- speed of passive data collection
- access to social graph data that official providers do not expose

## Current Decision

PAMOJA should proceed on the safe model for now:

- Auth0 for LinkedIn connection and identity confirmation
- local-first encrypted storage
- user-provided exports for deeper network history
- no scraping
