# Forma devlog

Forma is a mobile strength-training app with one promise: tell it what you want to accomplish, it handles the complexity, and it can always explain why. Built with Expo (React Native), TypeScript, and SQLite on the device. Newest entries first.

---

## 2026-09-07 · Day 1: architecture, foundation, onboarding, and the first run on a phone

### Where things stand
A new user can install the app, answer three questions, get a recommended training program with a plain-English reason, and land on a Home screen that knows which workout is next. It ran on a Google Pixel 9 through Expo Go: onboarding, the program, the day list with exercises, all responsive. Starting a workout does not do anything yet; that is the next milestone.

### What got built
**Architecture first, code second.** Thirteen documents in `docs/` cover product, UX, technical design, data model, training engine, AI coach, knowledge base, roadmap, and a screen-by-screen spec for Phase 1. A critical review pass changed several early decisions before any code existed: vertical workout list instead of a pager, no backend in Phase 1, RIR optional, five onboarding screens instead of seven, sequential scheduling so missed days just move on.

**M1, foundation.**
- Design system: light and dark tokens, one accent colour, 22 components including the workout stepper, an in-app numeric keypad, bottom sheets, and the "Why?" sheet.
- Domain model as Zod schemas, including the four-tier `Explanation` contract that every recommendation carries.
- SQLite schema via Drizzle with sync columns from day one, a generated migration, and a seeded catalog of 62 exercises and 4 program templates.
- An explanation registry: every engine rule has hand-written one-or-two-sentence text, and a test fails the build if a rule has no text or exceeds 180 characters.

**M2, onboarding to today's workout.**
- Engine: program selection with ranked alternatives, exercise substitution that preserves muscles and movement pattern and respects available equipment, session trimming that never removes primary lifts, scheduling with welcome-back logic after time off, bodyweight trend with a 7-day average and weekly rate.
- Five-screen onboarding. The program appears after three questions; personal details come after and can be skipped.
- Home: an accent-tinted Today card with the day name, muscle focus, exercise preview, Start, Do later, Skip, and a Why button. Bodyweight quick log. Week progress dots.
- Train tab shows the program with a Next marker. Settings covers units, RIR or RPE, theme, and workout toggles.

### Numbers
- 94 automated tests, type-check and lint clean.
- About 8,400 lines of TypeScript.
- 27 explainable rules, 62 exercises, 4 programs.

### Decisions worth knowing
- Everything runs on the device with no account and no server. Sync and the AI coach come in Phase 2.
- Loads are stored in kilograms with the entered value kept, so 75 lb never redisplays as 74.99 lb.
- Reps in reserve (RIR) is optional everywhere; the engine progresses on reps alone when it is missing.
- The component gallery reachable from Home is a developer tool showing every UI piece with sample data. It is not in production builds.

### What is next: M3, the workout screen
One-tap set logging from a sticky input dock, the rest timer inside the dock, prefilled loads with a Why button on each, warm-up sets, swaps, crash-safe resume, and a finish summary that says what changes next session. After that: history and progress charts (M4), program editing and the first recommendations (M5), polish and release (M6).

### How to run it
```
npm install
npx expo start        # then scan the QR with Expo Go on the phone
npm test              # engine and seed tests
```
From M3 onward a development build is needed instead of Expo Go: `eas build --platform android --profile development`.
