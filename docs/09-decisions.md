# 09 · Decisions Log

Validated by the product owner on 2026-09-07 unless marked otherwise.

## Overarching rule

**When simplifying the MVP, simplify infrastructure and breadth, not the quality of the core Plan → Do → Record → Learn loop.** The training engine, the explanation system, the offline database, and the data model are never cut to make the MVP smaller.

## Product

| # | Topic | Decision | Status |
|---|---|---|---|
| P1 | Name | Working name "Forma" in docs only | open |
| P2 | Monetisation | Core logging, progression, and explanations free forever. Entitlement flags from day one; no billing in Phase 1. Coach and sync are the likely subscription. Ads: see 10 §5, not in Phase 1 | principle validated; pricing open |
| P3 | Accounts | Optional, never required for the core loop; none in Phase 1 | validated |
| P4 | Tabs | Home · Train · Progress in Phase 1; Coach in Phase 2; Nutrition in Phase 3; settings behind avatar | validated |
| P5 | Cardio | Loggable, not coached | validated |
| P6 | Progress photos | Local capture in Phase 1; sync in Phase 3 | validated |
| P7 | Gamification | PRs and consistency only; one tasteful moment on PR and session finish | validated |
| P8 | Units | Locale default, changeable; stored in kg with entered value kept | validated |
| P9 | RIR / RPE | RIR canonical, **optional**, pre-set to target; RPE display-only | validated |
| P10 | Explainability | First-class feature, four tiers, one `Explanation` type, see 12 | validated |
| P11 | Scheduling | Programs sequential by default; optional weekday pinning; Do later / Skip; layoff handling | validated |

## UX

| # | Topic | Decision | Status |
|---|---|---|---|
| U1 | Workout layout | Vertical exercise list with expanded current exercise and a sticky input dock is the leading design; A/B against the pager with the lifter group in week 4 | validated |
| U2 | Rest timer | Persistent bottom bar, −15 / +15 / Skip, monotonic end time, background notification | validated |
| U3 | Load suggestions | Prefilled, editable, with Why; never a dialog | validated |
| U4 | Swap scope | Ask session vs program each time; default session-only | validated |
| U5 | Warm-ups | Auto-generated for priority-1 compounds, one tap to add, excluded from progression and volume | validated |
| U6 | Font | System font | validated |
| U7 | Onboarding | Five screens before the recommendation; personal details after it, skippable | validated |
| U8 | Recommendations | Max one card on Home, three pending, two-week expiry, no push | validated |

## Technical

| # | Topic | Decision | Status |
|---|---|---|---|
| T1 | Backend | None in Phase 1. Supabase in Phase 2 with the coach | validated |
| T2 | Local DB | expo-sqlite + Drizzle, live queries | validated |
| T3 | Styling | Typed StyleSheet + theme hook | validated |
| T4 | Sync | Sync columns from day one; outbox and transport in Phase 2; LWW single device; multi-device Phase 3 | validated |
| T5 | IDs | UUID v7 | validated |
| T6 | Repo | Single Expo app with package-shaped folders; extract packages in Phase 2 | validated |
| T7 | Charts | One-day spike in M1 | open |
| T8 | Observability | Crash reporting only (opt-in) in Phase 1 | validated |
| T9 | Min OS | iOS 16.4+, Android 8+ | validated |
| T10 | Device-loss story | System backups + JSON export/import in Phase 1 | validated |

## Engine

| # | Topic | Decision | Status |
|---|---|---|---|
| E1 | Progression | Double progression with RIR awareness; beginner linear on primary compounds; rep-then-load for bodyweight movements | validated |
| E2 | e1RM | Epley, reps ≤ 12, formula id stored | validated |
| E3 | Indirect volume | 0.5 default contribution, shown as secondary figure | validated |
| E4 | Volume landmarks | Advisory ranges, "typical range" copy | validated |
| E5 | Substitution | Weighted similarity, labelled as such | validated |
| E6 | Deload | Fatigue score, medium confidence, always a recommendation | validated |
| E7 | Missing RIR | Reps decide; RIR-dependent rules need ≥ 70% RIR coverage on that exercise | validated |
| E8 | Minimum data | Stagnation and fatigue need ≥ 4 exposures and ≥ 3 weeks | validated |

## AI and knowledge

| # | Topic | Decision | Status |
|---|---|---|---|
| A1 | Model | `claude-opus-5` server-side; effort medium for chat, high for proposals; evaluate a smaller model for routine turns with the eval set | validated, model choice revisited at M9 |
| A2 | Tools | Phase 2 server tools over the snapshot; Phase 3 client-executed tools | validated |
| A3 | Retrieval | No embeddings; whole knowledge base in the cached prompt with concept-tag highlighting; vector retrieval only if the corpus outgrows it | validated |
| A4 | Seed knowledge | ~50 drafts, honest empty sources where unverified, review before public launch | validated |
| A5 | Safety | Prompt boundary rules, safety knowledge items, engine-side action bounds | validated |
| A6 | Coach offline | History readable; engine explanations always offline | validated |

## Open

1. Name and branding (before M6).
2. Pricing and billing mechanics (end of Phase 1). Whether to run ads on the free tier (10 §5).
3. Chart library (M1 spike).
4. Launch markets and languages; strings are already routed through `t()`.
5. Knowledge review ownership.
