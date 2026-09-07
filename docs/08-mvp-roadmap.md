# 08 · MVP Roadmap

Validated 2026-09-07. Rule for all scoping decisions: **simplify infrastructure and breadth, never the quality of the Plan → Do → Record → Learn loop.** Each milestone ends with a build a real user could train with.

## Phase 1 — A complete, honest strength-training companion (~7–9 weeks)

### M1 · Foundation (weeks 1–2)
- Single Expo SDK 57 app, Expo Router, TypeScript strict, ESLint import boundaries, Jest.
- Design system: tokens, `useTheme` (light/dark, reduced motion, Dynamic Type), components: Button, IconButton, Chip, Card, ListRow, SectionHeader, Sheet, Stepper, NumericKeypad, TextField, Toggle, StatusPill, Skeleton, EmptyState, ErrorState, Toast, ExplainableValue, WhySheet. Dev-only component gallery route.
- `src/domain` types, Zod schemas, `Explanation` type. Drizzle schema + migrations for all Phase 1 tables. Seed loader with `catalog_version`.
- Exercise seed: first 60 exercises covering every movement pattern, with muscles, equipment, increments, instructions. Grow to ~150 by M4.
- Four program templates: Beginner Full Body 3x, Full Body 3x, Upper/Lower 4x, PPL 6x.
- Chart library spike (one day).
- **Done when:** app boots in both themes on both platforms, migrations and seed run, gallery shows every component, explanation-template test passes for the rule ids that exist.

### M2 · Onboarding → today's workout (week 3)
- Five-screen onboarding (13 §2), `engine.selectProgram` with rationale and Explanation, equipment-aware exercise fill via `rankSubstitutes`.
- Home with sequential scheduling ("Today: Upper A"), Do later / Skip, bodyweight quick log.
- **Done when:** a new user reaches "Start this program" in under 3 minutes and Home shows the correct next day.

### M3 · Workout logging (weeks 4–5) — the product
- Week 4, first two days: throwaway prototypes of the vertical list + input dock and the pager, on device, to the lifter group. Decision by end of week 4; vertical list is the leading design.
- Session creation, exercise list with expanded current exercise, sticky input dock, set rows, Complete Set, prefill logic, rest timer with background notification, swap (session or program), notes, skip, add set, warm-up sets, unilateral convention, finish summary with next-session changes.
- Autosave, crash-safe resume, airplane-mode verified.
- `engine.suggestNextTargets` v1 with full Explanations and counterfactuals; RIR optional; bodyweight-loaded progression; layoff rule.
- e1RM, PR detection, Why sheet everywhere a target appears.
- **Done when:** the logging success measures in 01 §7 pass on physical devices with the lifter group, and 8 of 10 testers can restate why a load changed after reading Tier 1.

### M4 · History and progress (week 6)
- History list, session detail with set editing, per-exercise history and chart.
- Progress: bodyweight 7-day trend and rate, strength (e1RM) per exercise, PRs, consistency, measurements; range picker.
- Exercise seed completed (~150).
- **Done when:** three weeks of logged data renders under 300 ms per screen with skeletons and empty states.

### M5 · Program editing and recommendations v1 (week 7)
- Program and day editing: swap, reorder, sets, rep range, RIR, rest, superset grouping. Browse and switch programs. Remaining three templates (Upper/Lower + Arms, 5-day hypertrophy, Strength-focused).
- Recommendation entity with caps (one on Home, three pending), expiry, Why / Apply / Keep, for `reduce_load`, `layoff`, `progression.calibrate`, beginner linear → double.
- Custom exercises with compact muscle/pattern tagging. Plate calculator. Auto warm-up sets for priority-1 compounds.
- **Done when:** edits persist, history keeps snapshots, recommendations respect caps.

### M6 · Polish and release candidate (weeks 8–9)
- Settings complete: units, RIR/RPE, theme, haptics, sound, advanced mode, notifications, export/import, crash reporting opt-in.
- Accessibility pass (screen readers on both platforms, Dynamic Type 130%, reduced motion), tablet sanity (nothing breaks; no dedicated layouts), performance profiling on mid-range Android.
- EAS production profile, store listings, privacy policy, Sentry.
- Maestro E2E: onboarding, full session offline, kill and resume, export/import round trip.
- **Done when:** TestFlight and Play internal builds are used daily by the lifter group for two weeks with no data loss.

## Phase 2 — Intelligence (~6–8 weeks)

- **M7 Volume and program builder**: `computeWeeklyVolume`, Progress → Volume with bands, direct vs including-indirect toggle; full program builder; weekly review screen.
- **M8 Stagnation, fatigue, compression**: `detectStagnation`, `assessFatigue`, `compressSession`; deload execution; "I have N minutes"; gym profiles ("different gym today").
- **M9 Backend and coach**: Supabase project, optional sign-in, backup sync (single device), entitlements wired to a subscription (RevenueCat), knowledge base bundled into the coach prompt, `coach` Edge Function with streaming and validated actions, Coach tab, eval set. Import from Strong and Hevy CSV.

## Phase 3 — The wider journey (~8+ weeks)

- **M10 Health and body composition**: HealthKit and Health Connect providers; Nutrition tab; phases with confirmed targets.
- **M11 Recovery and adaptive programming**: readiness check-ins, fatigue model upgrade, program-level recommendations, client-executed coach tools.
- **M12 Multi-device sync**: conflict-aware sync, photo sync.

## Before the first line of code

The next document, [13-phase1-ux-spec.md](13-phase1-ux-spec.md), is the screen-by-screen specification for Phase 1. Code starts from it, workout screen first.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Workout screen feels slow or fiddly | Prototype both layouts in week 4 with real lifters; two full weeks budgeted; mid-range Android tested weekly |
| Engine defaults feel wrong to lifters | Fixture tests from tester logs; override tracking; explanations make every decision visible and correctable |
| Data loss on device | Additive migrations tested in CI; export/import from M6; system backups |
| Scope creep | 01 §5 and the rule at the top of this document |
| Content (exercises, templates, explanation copy) takes longer than code | Start the exercise seed and explanation templates in week 1 in parallel with the design system |
