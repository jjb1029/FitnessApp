# Forma devlog

Forma is a mobile strength-training app with one promise: tell it what you want to accomplish, it handles the complexity, and it can always explain why. Built with Expo (React Native), TypeScript, and SQLite on the device. Newest entries first.

---

## 2026-09-11 · Visual identity, Tier 2A: the interface knows which phase you are in

Motion that communicates state, never decoration (docs/16 §7–§8). No new features, no engine or data-model change, and logging takes the same taps.

- **Five primitives, one budget.** `src/ui/motion.tsx` holds Ground (a phase's surface), Settle (something arriving in its place), Hand-off (one state giving way to the next in place), Reveal (supporting information after the primary change) and Recount (a number that changed because something happened). Each lands inside 250 ms, never gates a tap, and becomes an instant state change under reduced motion. The timing rules are pure and tested in `motionPlan.ts`: the budget, the order meaning arrives in, reduced motion, and that a number never recounts under the user's thumb.
- **The dock breathes instead of jumping.** It is now a stage above a fixed base. The base — weight, reps, effort, the button — never moves. The stage hands off between lifting and resting and glides between their heights, the dock's ground lifts while resting, and the list reserves the taller stage up front. Measured before the change: the dock's top edge snapped 69 px at every rest.
- **Resting looks like resting.** The history recedes under a veil of the page ground, the controls mute in place, and the countdown owns the dock. The numerals never animate; only the bar moves, now continuously.
- **Rest hands back at zero.** Measured before: `0:00` sat on screen for about two seconds. Now the dock returns to lifting in one hand-off, "Rest's up." becomes the lifting line, and focus goes back to Complete set.
- **Sets and exercises arrive.** A logged set keeps its place while its highlight drains and its check arrives; the next set's highlight fades in when rest ends; an exercise that becomes current settles into focus; the set count ticks over.
- **Haptics are confirmation.** The success pattern is kept for records. Good and better sets are a medium tap, tough sets a light one.

174 tests, 14 of them frame-by-frame checks of the primitives on Reanimated's test clock: the order of a hand-off, that the dock glides rather than snaps, that everything has landed by 250 ms, that reduced motion is instant, that a hidden stage takes no touches and cannot be reached by a screen reader, and that a number never recounts under the user's thumb. Jest now uses the worklets resolver so Reanimated runs in tests.

In the browser, read at each phase's end state: Complete set stays put and the list's reserved padding never changes across lifting, resting and lifting again, while the dock's stage goes 78 → 159 → 78 pt. Rest hands back within one timer tick of zero with "Rest's up.", and moving to the next exercise and finishing both work end to end. The preview pane was not rendering animation frames, so how the motion feels still needs judging on the phone.

## 2026-09-10 · Visual identity, Tier 1: numbers, the Decision Block, and what teal means

Three changes that give Forma a look rather than a theme (docs/16, Tier 1 of four). No new features, no engine change, no data-model change.

- **Numbers are a different material from words.** A five-step numeric ramp (13 / 17 / 22 / 32 / 44, tabular, one weight above the prose beside it) replaces the four ad-hoc `mono` sizes, and a `Measure` primitive sets every value with its unit a step down in tertiary. Set rows, the dock, the countdown, Why-sheet factors, summary evidence, next-time targets and bodyweight all go through it, so a column of sets now reads as a column of numbers.
- **The Decision Block is a component.** `DecisionBlock` fixes the grammar Forma had only in prose: eyebrow and door share the top row, the basis sits against the lead, the lead's size comes from the block's rank, and there is no border. Today, the current action, rest, the finish verdict and every next-time row are now the same shape at three scales.
- **Teal means Forma.** It is no longer the colour of anything tappable. The user's own action carries ink — a high-contrast neutral fill — and teal is left to mark Forma speaking, deciding, or offering its reasoning: the door, the resting phase, the countdown, an estimated max, "I've set next session." Buttons gained a `door` variant so the law is enforced in the type system. The ink fill sits behind `primaryActionFill` so one value flips the whole app back to teal.

Also fixed while looking at it: the reps stepper's unit column was ~17 pt wide once both 44 pt buttons were placed, so "reps" truncated to "r…" — the unit now spans the field and the three units share a baseline. Current and pending set rows were still built from a joined string while done rows were not; they now use the same treatment.

147 tests. Verified in the browser across five sessions in both themes, including rest, a record, and the Today sentence changing from "your first session" to "same weights as last time" as the data changed.

## 2026-09-08 · M3 character: what the screen is arranged around

The personality layer gave Forma a voice but not a shape. The workout screen was still arranged the way every tracker is arranged: a list of the workout with a data-entry surface attached, with good copy on top. This pass reorganises the screens around the decision Forma made rather than the record the user is keeping (docs/15).

- **The current action is one block.** The dock now owns the exercise name, the numbers, and the button, so "what am I doing right now" is a single unit under the thumb. The exercise title in the list dropped from 22 pt to 17 and the set numbers rose to 32 pt bold, so the loudest thing on the workout screen is what you are about to lift. The block above the dock became the history.
- **Forma speaks up only when it did something.** The dock has one line slot with three registers: a moment when something happened, the decision when you arrive at an exercise, and a quiet reference line while you work. Arrival moments fire for the three things a tracker would never say: it changed its own jumps after you overrode it three times, it eased the weight after two tough sessions, and it is asking for a load you have never lifted. Held back during rest so they land when you return to the action.
- **Why reads like a person answering.** The decision, what I saw, what changes my mind, and then how the rule works one tap further in.
- **The finish is a debrief.** A verdict from the session data leads, the per-lift evidence follows, and it closes with "I've set next session" above the actual targets.
- **Home leads with readiness.** "Upper A is ready." with the sentence as its basis.

Also fixed: `useKeepAwake` crashed the workout screen on a second session because the lock had not finished activating. Replaced with a hook that swallows the failure.

138 tests. Verified in the browser across two sessions, including the same-day rule correctly declining to progress twice in one day.

## 2026-09-08 · M3 polish: the personality layer

After the first phone run the verdict was "clean but bland". The audit (docs/14) found the cause: the engine made every decision but the screens showed them as metadata, nothing acknowledged the user, and rest looked like lifting with a countdown. This pass adds a voice and a rhythm on top of the existing foundation, with no new features.

- **Voice** (`src/engine/voice.ts`): every line is chosen by a state. Target sentences ("80 lb today. Up from 75."), graded set acknowledgements ("Good set." / "That was better than last time." / "Tough set. Logged. I will account for that."), "Rest's up.", record lines, finish verdicts, and the Home sentence. Deterministic rotation; no exclamation marks, no emoji.
- **Rhythm**: the header shows the phase (Lifting · Resting); the dock shifts into recovery mode with a large countdown, muted fields, a next-set preview, ticks in the last three seconds, and a highlight on Complete set when rest ends; a completed set lands with a brief success tint; haptics are graded by outcome; a record shows inline in the dock with a "Best" pill on the row.
- **Why sheet**: opens on the decision, promotes "What changes my mind", and the deeper tiers read as "What I saw" and "How I decide". All 33 rule descriptions rewritten in Forma's voice.
- **Summary**: a verdict sentence from the session data, records first, next-time rows as decisions, "Done for today."
- **Exercise blocks**: target in words, first-time guidance, Add set plus a menu, "Next" marker, borderless surfaces.
- **Home**: "Upper A is ready" and one sentence about today from the engine's targets.
- **Tokens**: accent moved from app blue to mineral teal, used only for active states; numbers in the dock at weight 600.

130 tests. Verified in the browser through onboarding, a logged set, recovery, return, the Why sheet, and an early finish.

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
