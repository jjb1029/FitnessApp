@AGENTS.md

# Forma (working name)

Mobile-first strength-training app. Expo SDK 57, Expo Router, TypeScript strict, expo-sqlite + Drizzle, Zustand, Zod. Read `docs/00-overview.md` first; `docs/13-phase1-ux-spec.md` is the screen spec code is built from; `docs/09-decisions.md` lists validated decisions.

## Rules that shape every change
- Simplify infrastructure and breadth, never the core Plan → Do → Record → Learn loop (docs/01 §6.9).
- Every recommendation carries an `Explanation` built by `buildExplanation()` in `src/engine`; only `WhySheet` renders them. Never assemble explanation text in screens (docs/12).
- `src/engine` and `src/domain` are pure: no React, Expo, or Drizzle imports (enforced by ESLint).
- Loads are stored in kg (`load_kg`) with the entered value kept; display rounds via `displayLoad()`.
- RIR is optional everywhere. Programs are sequential by default.
- No backend, auth, sync, or analytics in Phase 1. Web is for the component gallery only.

## Commands
- `npm run typecheck` · `npm run lint` · `npm test`
- `npm run db:generate` after changing `src/data/schema` (migrations are additive only)
- `npm run web` then open `/dev/gallery` to preview components
- Native: `npx expo run:android` / `npx expo run:ios` (dev build; Expo Go is not sufficient for SQLite migrations + notifications)

## Layout
`src/app` routes → `src/features` screens → `src/ui` design system · `src/engine` rules · `src/data` Drizzle schema/repos/seed · `src/domain` types · `src/exercises` seed content · `src/store` Zustand.
