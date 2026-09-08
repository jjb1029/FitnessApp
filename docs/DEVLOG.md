# Forma devlog

Forma is a mobile strength-training app with one promise: tell it what you want to accomplish, it handles the complexity, and it can always explain why. Built with Expo (React Native), TypeScript, and SQLite on the device. Newest entries first.

---

## 2026-09-07 · M3: the workout screen

### Where things stand
The core loop is closed. Start today's workout from Home, log sets from a sticky dock at the bottom of the screen, rest with a timer that survives backgrounding, finish, and read what changes next time with a Why on every number. The next session's targets come from the progression engine using what was actually logged.

### What got built
- **Progression engine v1** (`src/engine/progression.ts`): double progression with optional RIR, beginner linear loading that switches itself to double progression after two misses, bodyweight movements that add load only after the rep range is filled, layoff easing, same-day guard, override calibration after three consistent overrides, and never more than two increments of change. Every outcome is an Explanation with a counterfactual ("If 8 reps at 80 lb is too hard, I will keep 80 and aim for the bottom of the range next time"). 14 fixture tests cover the brief's worked examples.
- **Estimated 1RM and records**: Epley for 12 reps or fewer, personal records only once a completed session exists for the exercise, so the first day sets baselines rather than trophies.
- **Warm-up suggestion**: two or three ramp sets for primary compounds from the working load.
- **Session data layer**: start a session with engine targets snapshotted per exercise, save and edit sets with PR detection, swap an exercise (session-only or into the program, with an avoid preference recorded for discomfort), add exercises, skip with a reason, finish with a summary and next-time targets, abandon, and a stale-session recovery path on Home after 12 hours.
- **Workout screen**: vertical exercise list with the current exercise expanded and others one line each, the input dock (Weight and Reps steppers, optional RIR picker, Why, Complete set), rest timer inside the dock with −15 / +15 / Skip and a local notification when backgrounded, in-app keypad with quick-add chips, edit a done set in place, add set, warm-ups, swap sheet with similarity scores and Why, notes, exercise info sheet, session menu, finish-early and discard confirmations, and a summary with one PR moment and explainable next-time targets.
- **Around it**: a Resume pill above the tab bar while a session is minimised, keep-awake during workouts, haptics that respect the setting, and in-memory web stubs so the whole flow can be exercised in a browser.

### Verified
Type-check and lint clean, 122 tests. In the browser: onboarding → Home → Start workout → three sets logged with keypad and steppers → auto-advance to the next exercise → Why sheet → finish early → summary. Not yet verified on a phone.

### What is next
M4: history, per-exercise charts, bodyweight and strength trends, PR list. Then M5 program editing and the first recommendation cards.

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
