# 02 · UX Architecture

## 1. Navigation

Mobile bottom tab bar. Tabs are added as phases ship so the app never has empty destinations.

| Phase 1 | Phase 2 | Phase 3 |
|---|---|---|
| Home · Train · Progress | Home · Train · Progress · Coach | Home · Train · Progress · Coach · Nutrition |

Profile and settings live behind the avatar in the Home header, not in a tab. The brief's "Workout / Nutrition / Coach" tabs are kept in spirit; "Train" is used instead of "Workout" because the tab holds programs and history as well as the active session.

**Tab responsibilities (answering the four questions):**

| Tab | Where am I? | What should I do? |
|---|---|---|
| Home | Command center | Start today's session, read recommendations |
| Train | Program and sessions | Start/resume a session, browse program, view history |
| Progress | Trends and records | See what changed, log bodyweight and measurements |
| Coach | Conversation with the system | Ask why, ask for changes |
| Nutrition | Energy balance | Review intake vs trend, confirm target changes |

**Modal routes (Expo Router stack, presented over tabs):**
- `/workout/[sessionId]` — the active session. Full-screen, no tab bar, gesture-dismiss disabled during an active set, with a persistent "Workout in progress" pill on tabs when minimised.
- `/exercise/[id]` — exercise detail (instructions, history, alternatives).
- `/swap/[templateExerciseId]` — substitution flow (bottom sheet).
- `/recommendation/[id]` — recommendation detail with Why / Apply / Keep.
- `/onboarding/*` — its own stack, shown once.
- `/settings/*` — profile, units, preferences, integrations, data export.

## 2. Screen map

```
Onboarding (stack) — validated order, value before personal data
 ├─ Goal
 ├─ Experience & schedule (experience, days/week, session length)
 ├─ Equipment & place (gym / home / both, equipment chips)
 ├─ Recommendation ("Here's what I'd recommend") → Modify | Start
 └─ Personalise (bodyweight; optional: birth year, sex, height, exercises to avoid) — all skippable

Tabs
 ├─ Home
 │   ├─ Greeting + goal chip
 │   ├─ Today card → Start / Resume / Rest day + "Move workout"
 │   ├─ Progress snapshot (1–2 metrics)
 │   ├─ Recommendation card(s) → detail
 │   └─ Quick log bodyweight
 ├─ Train
 │   ├─ Current program (days as list, next day highlighted)
 │   ├─ Program detail → Program Day detail → edit template
 │   ├─ Browse programs → Program preview → Switch
 │   └─ History (calendar strip + session list) → Session summary
 ├─ Progress
 │   ├─ Overview (bodyweight trend, strength index, consistency)
 │   ├─ Strength → per-exercise e1RM chart, PRs
 │   ├─ Volume (Phase 2) → per-muscle weekly sets with range bands
 │   ├─ Body → bodyweight, measurements, photos
 │   └─ Range picker: 7D 30D 90D 6M 1Y All
 ├─ Coach (Phase 2)
 │   ├─ Conversation
 │   ├─ Suggested prompts drawn from current data
 │   └─ Proposed action cards inline → Apply / Keep
 └─ Nutrition (Phase 3)

Workout (modal) — vertical list is the leading design; A/B against a pager in week 4
 ├─ Session header: name, elapsed time, sets done / total, ⋯ menu
 ├─ Exercise list (vertical, scrolls under the dock)
 │   ├─ Current exercise expanded: target, previous, set rows, Swap · Notes · Skip
 │   └─ Other exercises collapsed to one line (name, sets done/total, last load); tap to make current
 ├─ Input dock (sticky bottom): Weight · Reps · RIR · Why? · Complete Set
 ├─ Rest timer bar (replaces the dock's top edge while resting: −15s / +15s / Skip)
 └─ Finish → Session summary (PRs, next-session changes with Why)
```

## 3. Key flows

### 3.1 Onboarding (target: under 3 minutes, five screens)
- One question per screen, large tap targets, progress indicator as a thin bar, no percentages.
- The user sees their recommended program after three questions (goal, experience and schedule, equipment). Personal details come after, on one skippable screen. Required data: goal, experience, days per week, session length, equipment. Everything else has a sensible default and can be set later.
- The Recommendation screen shows: program name, split, days per week, session length, and a two-sentence rationale. Below: the days as compact cards. Actions: **Start this program** (primary), **Modify** (opens program editor), **See other options** (secondary).
- Account creation is *not* in onboarding. After the first completed session, a non-blocking card offers "Back up your data" which triggers sign-in.

### 3.2 Starting and logging a workout
The full specification is in [13-phase1-ux-spec.md](13-phase1-ux-spec.md) §W. Summary:
1. Home → **Start workout** (1 tap). Session is created locally and immediately persisted.
2. The first exercise is expanded in the list with its target ("3 × 8–12 @ 1–2 RIR"), previous sets, and set 1 pre-filled in the dock with the engine's suggested load and reps. "Why?" sits beside the load.
3. User adjusts in the dock with steppers (per-exercise increments) or taps a value for the keypad. RIR is pre-set to target and optional.
4. **Complete Set** (one tap). Haptic tick, the set row becomes a done row, rest timer starts, the dock pre-fills the next set from the set just done.
5. Rest timer runs in the dock's top edge; a local notification fires when rest ends if the app is backgrounded.
6. When the last set of an exercise is done, the next exercise expands and the list scrolls to it. Any exercise can be tapped to become current.
7. **Finish** → summary: duration, sets done, PRs, and what the engine will change next time, each with Why.

Rules for this screen:
- Minimum touch target 48×48 pt. Dock controls 56 pt tall. Complete Set button full width of the dock, 56 pt.
- Everything needed to log a set lives in the dock, in the bottom 25% of the screen; the list scrolls underneath.
- Done sets are compact rows; tapping one loads it into the dock for editing in place.
- Autosave on every change. Killing the app and relaunching returns to the same set.
- Adding a set, skipping a set, and marking a set as warm-up are one-tap actions on the expanded exercise.

### 3.3 Swapping an exercise
Bottom sheet: "Why are you swapping?" with six reason chips (Equipment unavailable · Don't like it · Discomfort · Too hard · Too easy · Variety). Then a ranked list with a similarity score and a one-line reason ("Same pattern, machine-stabilised"). Toggle: "Just this session" / "Update my program". Discomfort shows a short note: "If this is pain rather than discomfort, consider speaking with a professional."

### 3.4 Recommendations
Recommendation cards have a uniform anatomy: **Title** (Tier 0 line), **Why?** text button that expands the one-or-two-sentence Tier 1 explanation in place with its factor row, **Apply** (primary), **Keep current** (secondary). "Show details" inside the expanded state opens the `WhySheet` at Tier 2. Apply and Keep stay visible while reading. Applied and dismissed recommendations remain visible in a history list. Tier definitions and writing rules are in [12-explainability.md](12-explainability.md).

### 3.5 Logging bodyweight
Home quick-log: tap the weight, keypad, done. Shows the 7-day average as the headline with the raw daily number beneath.

## 4. Design system

### 4.1 Principles
Calm, restrained, high contrast, fast. Color carries meaning, not decoration. Motion is functional (state changes, timer) and respects reduced-motion settings.

### 4.2 Tokens

**Color (light / dark)**

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #FFFFFF | #0B0C0E | Screen background |
| `bgElevated` | #F5F6F7 | #16181C | Cards, sheets |
| `bgSunken` | #EDEEF0 | #0F1114 | Inputs, wells |
| `border` | #E2E4E8 | #24272D | Hairlines |
| `text` | #111318 | #F2F3F5 | Primary text |
| `textSecondary` | #5C6370 | #A0A6B1 | Secondary |
| `textTertiary` | #8B919C | #6B717C | Hints, labels |
| `accent` | #2F6BFF | #5B8CFF | Primary actions, links, current state |
| `accentSubtle` | #E9F0FF | #17233F | Selected chips, accent backgrounds |
| `success` | #1F9D55 | #3DBB74 | Completed, positive change |
| `warning` | #C98A00 | #E5A800 | Attention, plateau |
| `danger` | #D3393C | #F0555A | Warnings, destructive |
| `*Subtle` variants | tinted | tinted | Status backgrounds |

Exactly one accent color. Muscle-group and chart series use a small categorical set defined once in the chart module.

**Typography** — system font (SF Pro / Roboto) for native feel and zero load time. Scale (size / line height): `display` 34/40 semibold · `title1` 28/34 semibold · `title2` 22/28 semibold · `headline` 17/22 semibold · `body` 17/22 · `callout` 15/20 · `caption` 13/18 · `mono` 17/22 with tabular numerals for all weights, reps, timers. Minimum body text 15 pt; supports Dynamic Type scaling to 130% without layout breakage.

**Spacing** — 4 pt grid: 4, 8, 12, 16, 20, 24, 32, 40, 48. Screen horizontal padding 20. Card padding 16.

**Radius** — `sm` 8 · `md` 12 · `lg` 16 · `full` 999. Buttons `md`, cards `lg`, chips `full`.

**Elevation** — flat by default. Cards are distinguished by `bgElevated` and a 1 px `border`, not shadows. Bottom sheets get one soft shadow.

### 4.3 Components (built once, in `src/ui`)
Button (primary / secondary / ghost / destructive; sizes md 48 / lg 56) · IconButton · Chip (selectable) · Card · ListRow · SectionHeader · Sheet (bottom sheet with drag handle) · Modal · SegmentedTabs · Stepper (large numeric) · NumericKeypad · TextField · Toggle · ProgressBar · StatusPill (icon + text, never color alone) · Skeleton · EmptyState · ErrorState · Toast · Avatar · RangeBand (Low / Optimal / High) · Chart primitives (Line, Bar, Sparkline) · ExerciseCard · SetRow · RestTimerBar · RecommendationCard · MuscleVolumeRow · **ExplainableValue** (value + delta + "Why?" text button, Tier 0) · **WhySheet** (the single renderer for every `Explanation`, Tiers 1–3; see 12).

### 4.4 Motion
Durations 150–250 ms. Spring for sheets. Timer ring animates on the UI thread (Reanimated). Under reduced motion all non-essential animation becomes a cross-fade.

### 4.5 Haptics
Light tick on set complete, stepper detents, and timer end. Success haptic on PR. Never on navigation.

## 5. State handling per screen

Every data-bound screen defines all five: **loading** (skeleton, never spinner-only), **empty** (one sentence, one action), **error** (message + retry, offline-aware wording), **success**, and **offline** (network-dependent features show an inline "Offline — will sync" pill; local features show nothing different).

## 6. Accessibility

- All interactive elements carry `accessibilityRole` and `accessibilityLabel`; steppers announce the new value.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for large text and UI boundaries, verified for both themes.
- Status never conveyed by color alone (icon + text on pills, patterns on chart bands).
- Full keyboard and switch-control navigation on the workout screen.
- Reduced motion, larger text, and bold text settings respected.
- Rest timer completion has sound, haptic, and visual signal.

## 7. Responsiveness

Phones first. Phase 1 guarantees nothing breaks on tablets (content max-width 600 dp, centred). Breakpoints for later phases: medium (600–900 dp) and expanded (> 900 dp) move tabs to a side rail and introduce list-detail layouts on Train and Progress. Safe areas and Android edge-to-edge are handled at the layout level, never per screen.
