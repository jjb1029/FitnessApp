# Architecture Overview

**Project:** Working name **Forma** (placeholder, easy to rename; used only in docs).
**Date:** 2026-09-07
**Status:** Architecture phase. No application code written yet.

This folder is the design record for the app. Each document is self-contained but they build on each other in order.

| # | Document | What it decides |
|---|----------|-----------------|
| 01 | [Product Architecture](01-product-architecture.md) | Vision, the core loop, what is in and out of scope, product rules |
| 02 | [UX Architecture](02-ux-architecture.md) | Navigation, screen map, key flows, design system, states |
| 03 | [Technical Architecture](03-technical-architecture.md) | Stack, versions, module layering, offline-first, sync, auth, backend |
| 04 | [Data Model](04-data-model.md) | Entities, fields, relationships, SQLite schema, sync metadata |
| 05 | [Training Engine](05-training-engine.md) | Progression, substitution, volume, fatigue, adaptive rules |
| 06 | [AI Architecture](06-ai-architecture.md) | Coach service, context assembly, tools, safety, model choice |
| 07 | [Knowledge Base Architecture](07-knowledge-base-architecture.md) | Knowledge item schema, retrieval interface, seed plan |
| 08 | [MVP Roadmap](08-mvp-roadmap.md) | Phases, milestones, acceptance criteria, first sprint |
| 09 | [Decisions and Open Questions](09-decisions.md) | Every ambiguity found and how it was resolved |
| 10 | [Decision Review](10-decision-review.md) | The four unresolved decisions: options, trade-offs, recommendations (not locked in) |
| 11 | [Architecture Critique](11-architecture-critique.md) | Risks, unnecessary complexity, missing pieces, proposed simplifications (proposals) |
| 12 | [Explainability](12-explainability.md) | The four-tier "Why?" system: types, UI contract, writing rules (applied) |
| 13 | [Phase 1 UX Specification](13-phase1-ux-spec.md) | The journey and every Phase 1 screen, workout screen in full detail; code starts here |

**Validated 2026-09-07:** vertical workout layout (A/B against pager), no backend in Phase 1, single app, simplified infrastructure; the engine, explanations, offline database, and data model are never cut. Overarching rule in 01 §6.9.

## The one-paragraph version

Forma is a mobile-first (Expo / React Native / TypeScript) strength and hypertrophy app whose core promise is *"tell the app what you want, it handles the complexity."* The user's data lives on the device in SQLite so workouts work with no signal. A deterministic **training engine** (progression, substitution, volume, fatigue rules) makes every recommendation and every recommendation is explainable. A server-side **AI coach** built on the Claude API reads the user's real data plus a curated **knowledge base** and proposes changes, but never applies them silently. The product is built vertically in three phases, each of which ships a usable app.

## How to read the layering

```
┌─────────────────────────────────────────────────────────┐
│  UI (Expo Router screens, components, design system)    │
├─────────────────────────────────────────────────────────┤
│  Application layer (use-cases, view models, stores)      │
├──────────────────┬──────────────────┬───────────────────┤
│  Training Engine │  Coach client    │  Integrations     │
│  (pure TS rules) │  (API adapter)   │  (Health, etc.)   │
├──────────────────┴──────────────────┴───────────────────┤
│  Domain model + repositories (Drizzle over expo-sqlite)  │
├─────────────────────────────────────────────────────────┤
│  Sync outbox  →  Backend (Supabase: Auth, Postgres, API) │
└─────────────────────────────────────────────────────────┘
```

The training engine is pure TypeScript with no React or database imports. It is the most valuable and most testable part of the codebase, and it is shared unchanged between the app and the coach service.
