# 13 · Phase 1 User Journey and Screen Specification

Status: implementation-ready specification. Code starts from this document, workout screen first. Where a decision here conflicts with an earlier document, this one wins.

Every screen is specified with the same fields: **Purpose · Layout · Elements · Interactions · Engine and data · States · Accessibility · Done when.** Wireframes are schematic; spacing, type, and colour come from the tokens in 02 §4. Units shown in lb; kg users see kg everywhere.

---

## 1. The Phase 1 journey

**Day 0, first launch (3 minutes).** Splash → Goal → Experience & schedule → Equipment → "Here's what I'd recommend: Upper/Lower, 4 days, ~55 min" with a two-sentence reason → Start this program → Personalise (bodyweight; the rest skippable) → Home shows **Today: Upper A**.

**Day 1, first workout.** Start workout → the first exercise is expanded, the dock shows the seeded load with "Why?" ("A conservative start; I'll adjust from your first session") → log sets, adjust freely → rest timer runs itself → finish → summary lists what will change next time.

**Week 1.** Home always says what today is. A missed day just stays "next". The user notices every prefilled number has a Why and that yesterday's overrides are respected.

**Week 3.** First real recommendations appear on Home, one at a time: "Drop incline press to 75 lb" with Why / Apply / Keep. Progress shows a bodyweight trend and the first PRs. History shows every session.

**Week 5, after a holiday.** Home says "Welcome back, 9 days off. I've eased today's loads by 10%." Tapping Why shows the layoff rule and the exact loads.

**Anytime.** The app works with no signal. Nothing asks for an account. Settings offers export.

---

## 2. Onboarding

Shared frame: thin progress bar at top (5 segments), back chevron, a large question in `title1`, options as full-width selectable rows or chips, a primary **Continue** button pinned above the safe area (56 pt). Selecting a single-choice option advances automatically after 250 ms; multi-choice screens need Continue. Nothing is saved to the database until O4 is confirmed, but answers survive app backgrounding (MMKV draft).

### O1 · Goal
- **Purpose:** the one question that shapes everything.
- **Elements:** "What do you want to accomplish?" · seven rows with a one-line subtitle each:
  - Build muscle — "Gain size and strength"
  - Lose fat — "Get leaner while keeping muscle"
  - Build muscle and lose fat — "Recomposition, best for newer lifters"
  - Get stronger — "Lift heavier on the big movements"
  - Improve general fitness — "Feel and move better"
  - Maintain — "Keep what you've built with less time"
  - Athletic performance — "Power and conditioning for sport"
- **Interactions:** single tap advances.
- **States:** none. **Done when:** a goal is stored in the draft.

### O2 · Experience and schedule
- **Elements:** "How much do you train?" · segmented experience: *New (under a year)* / *1–4 years* / *4+ years* with subtitle "Counting consistent training" · days per week chips 2 3 4 5 6 · session length chips 30 45 60 75 90 min · Continue.
- **Engine and data:** defaults preselected: 1–4 years, 4 days, 60 min, so a single Continue is valid.
- **Copy rule:** never "beginner/intermediate/advanced" on screen; the labels above map to those internally.

### O3 · Equipment and place
- **Elements:** "Where will you train?" · segmented Gym / Home / Both · equipment chips (multi-select) grouped: *Barbell & rack, Dumbbells, Cables, Machines, Smith machine, Bench, Pull-up bar, Bands, Kettlebells, Bodyweight only*. Choosing Gym preselects everything except bands and kettlebells; Home preselects nothing; Both shows two chip groups.
- **Interactions:** "I'm not sure" link under the chips selects the Gym default with a note that swaps are easy later.
- **Done when:** at least one equipment item or "Bodyweight only" is selected.

### O4 · Recommendation
- **Purpose:** show value before asking for anything personal.
- **Layout:**
```
 ┌────────────────────────────────────────┐
 │ Here's what I'd recommend              │  title1
 │                                        │
 │ Upper / Lower                          │  title2
 │ 4 days a week · about 55 minutes       │  callout, secondary
 │                                        │
 │ It fits four days and gives each       │  body, ≤ 2 sentences (Tier 1)
 │ muscle two sessions a week, which is   │
 │ a good balance of work and recovery.   │
 │ Why this program?                      │  text button → WhySheet
 │                                        │
 │ Upper A  · Incline DB press, Lat       │  compact day cards, tap to expand
 │           pulldown, +4 · 55 min        │
 │ Lower A  · Hack squat, RDL, +3 · 50 min│
 │ Upper B  · …                           │
 │ Lower B  · …                           │
 │                                        │
 │ [ Start this program ]                 │  primary 56
 │ Modify        See other options        │  ghost
 └────────────────────────────────────────┘
```
- **Interactions:** Start → creates User, Profile, Goal, Program (copied from template, exercises filtered by equipment), then O5. Modify → program day editor (T2) in "setup" mode, then back here. See other options → T3 in picker mode showing the two next-best templates first, each with a one-line "why not first" reason.
- **Engine:** `selectProgram(profile)` returns template, rationale Explanation, and alternatives; `rankSubstitutes` replaces any exercise whose equipment is unavailable, recorded in the program's `explanation.alternatives`.
- **States:** if equipment excludes a template entirely (bodyweight only), the recommendation is the bodyweight variant and says so.

### O5 · Personalise
- **Elements:** "A couple of details to personalise" · bodyweight field (large numeric, unit toggle lb/kg, prefilled blank, required-with-skip) · birth year, sex (Male / Female / Prefer not to say), height, each optional · "Anything you'd rather avoid?" shown only for 1–4 years and 4+ years: twelve chips of common disliked movements (Barbell back squat, Conventional deadlift, Overhead press, Dips, Pull-ups, Lunges, Burpees, Leg press, Bench press, Hip thrust, Face pulls, Running) · **Done** primary · **Skip for now** ghost.
- **Copy:** bodyweight explanation, one line: "Used for your weight trend and bodyweight exercises. Only you see it."
- **Data:** avoided chips write `ExercisePreference(avoid)` and trigger swaps in the program with explanations. Skip stores nothing; Home shows a quiet "Add your weight to see trends" row until logged.

---

## 3. Home (H1)

- **Purpose:** answer "what am I doing today" in one glance and one tap.
- **Layout (default, training day):**
```
 ┌────────────────────────────────────────┐
 │ Good morning                   (avatar)│  title2 + 36 pt avatar → settings
 │ Build muscle · Week 3                  │  caption, secondary
 │                                        │
 │ ┌ TODAY ───────────────────────────┐   │  card, bgElevated
 │ │ Upper A                          │   │  title1
 │ │ 6 exercises · about 55 min       │   │  callout
 │ │ Incline DB press · Lat pulldown ·│   │  caption, 1 line, ellipsised
 │ │ Cable row · …                    │   │
 │ │ [        Start workout        ]  │   │  primary 56
 │ │ Do later          Skip this day  │   │  ghost, 44 pt
 │ └──────────────────────────────────┘   │
 │                                        │
 │ Bodyweight   182.4 lb  ↓ 0.4 / wk  [+] │  ListRow → P3; [+] opens quick log
 │ Strength     +2.1 % this month      ›  │  ListRow → P1
 │ This week    ●●○○  2 of 4 done         │  ListRow → T1
 │                                        │
 │ ┌ SUGGESTED ───────────────────────┐   │  at most one; hidden when none
 │ │ Ease off hack squats today       │   │  headline
 │ │ Two tough sessions in a row.     │   │  Tier 1, ≤ 2 sentences
 │ │ Why?                             │   │  text button → expands in place
 │ │ [ Apply ]      Keep current      │   │
 │ └──────────────────────────────────┘   │
 └────────────────────────────────────────┘
```
- **Today card states:**
  - *Training day*: as above.
  - *In progress*: title "Upper A · in progress", subtitle "23 min · 5 of 14 sets", button **Resume workout**.
  - *Rest day* (weekday mode only): "Rest day", subtitle "Next: Lower A", button **Train anyway** (secondary style).
  - *Welcome back* (≥ 5 days): eyebrow "Welcome back · 9 days off", subtitle adds "Loads eased 10% · Why?".
  - *All days done this week* (weekday mode): "Week complete", next day preview.
  - *Program restart suggested* (≥ 28 days): a recommendation card, not a card state.
- **Interactions:** Start → creates Session, opens W1 (modal). Do later → no change, card collapses to a one-line "Upper A · later today" row and the rest of Home stays. Skip this day → confirm sheet ("Skip Upper A? Next up will be Lower A") → pointer advances. Pull to refresh recomputes derived data (no network).
- **Engine and data:** `resolveTodaysWorkout`, bodyweight 7-day average and weekly rate (needs ≥ 2 entries in 14 days, else "Log your weight to see a trend"), strength index (needs ≥ 2 weeks, else hidden), pending recommendations sorted by priority, first shown.
- **States:** loading skeleton for the card only; empty states per row as above; never an error state (all local).
- **Accessibility:** the Today card is one accessible group announcing "Today, Upper A, 6 exercises, about 55 minutes, Start workout button".
- **Done when:** a returning user reaches the first set input in two taps from cold launch.

### Quick log bodyweight (sheet)
Numeric keypad sheet, unit shown, prefilled with the last entry, **Save** primary, "Today" date with tap to change (yesterday, pick a date). Saving shows a toast "Logged 182.4 lb · 7-day average 182.6". Second entry on the same day replaces the first with a one-line confirmation.

---

## 4. Workout

### W1 · Active session
- **Purpose:** log a set in one tap when the suggestion is right, and in as few as possible when it is not, one-handed, with no scrolling required for the current set.
- **Layout:**
```
 ┌────────────────────────────────────────┐
 │ ✕   Upper A            32:14      ⋯    │  header 56: minimise, name, elapsed, menu
 │ ▰▰▰▰▰▱▱▱▱▱▱▱▱▱  5 / 14 sets            │  thin progress + caption
 ├────────────────────────────────────────┤
 │ Warm-up · Barbell bench   ✓ 2 sets     │  collapsed done exercise (one line)
 │────────────────────────────────────────│
 │ Incline Dumbbell Press           ⋯     │  CURRENT (expanded), bgElevated
 │ 3 × 8–12 · 1–2 RIR · rest 1:30         │  callout
 │ Last time  75×10 · 75×9 · 70×11        │  caption, secondary
 │                                        │
 │  1   ✓  80 × 10 · 2 RIR                │  done row (tap to edit)
 │  2   ▶  80 × 10                        │  current row (mirrors the dock)
 │  3      80 × –                         │  pending row (preview)
 │                                        │
 │  + Add set        Swap · Note · Skip   │  44 pt text buttons
 │────────────────────────────────────────│
 │ Lat Pulldown                0 / 3      │  collapsed upcoming
 │ 3 × 10–12 · last 140×12                │
 │────────────────────────────────────────│
 │ Seated Cable Row            0 / 3      │
 │ …  (list continues, scrolls under dock)│
 ├────────────────────────────────────────┤
 │ Set 2 of 3 · Suggested 80 lb ↑5   Why? │  DOCK context line (Tier 0)
 │ ┌───────────┐ ┌─────────┐ ┌───────┐    │
 │ │ −  80  + │ │ − 10  + │ │ RIR 2 │    │  56 pt fields; tap number → keypad
 │ │    lb    │ │   reps  │ │   ▾   │    │
 │ └───────────┘ └─────────┘ └───────┘    │
 │ [          Complete set  ✓           ] │  56 pt, accent
 └────────────────────────────────────────┘
```
  Proportions: dock height ≈ 168 pt plus safe area; weight field 42%, reps 34%, RIR 24% of dock width; 8 pt gaps; horizontal padding 16.

- **Elements and behaviour, in detail:**

  **Header.** ✕ minimises (session continues; tabs show a "Upper A · 32:14 · Resume" pill above the tab bar). Elapsed time is wall-clock since start. ⋯ opens W4.

  **Progress bar.** Working sets completed / planned, including added sets. Warm-ups excluded.

  **Exercise blocks.** One block per SessionExercise, in order. Exactly one is *current*. Current is expanded and pinned to the top of the viewport when it becomes current (animated scroll, 250 ms; instant under reduced motion). Collapsed blocks show: name, sets done / planned, and either "last 140×12" (upcoming) or "✓ 3 sets" (done). Tapping a collapsed block makes it current and expands it; the dock switches to that exercise's next pending set. Blocks with all sets done stay collapsed with a check; tapping them expands to allow adding a set or editing.

  **Expanded block content.** Name (headline) with ⋯ (exercise menu: Exercise info, Swap, Note, Skip exercise, Mark as warm-up exercise). Target line built from the template. "Last time" line shows the previous session's working sets for this exercise, or "First time" if none. Set rows: index or "W" for warm-up · state glyph (✓ done, ▶ current, blank pending) · values. Done rows show load × reps · RIR (RIR omitted if not logged). Pending rows preview the prefill. **+ Add set** appends a pending working set prefilled from the last done set. **Swap** opens W3. **Note** opens a single-field sheet (stored on SessionExercise, shown as an italic line under the target). **Skip** marks the exercise skipped with a one-tap reason chip (No time · Equipment busy · Not feeling it · Discomfort), collapses it, and makes the next exercise current; a skipped exercise can be un-skipped by tapping it.

  **Dock context line (Tier 0).** "Set N of M · Suggested 80 lb ↑5 · Why?" when the current values equal the suggestion. If the user changes a value, the line becomes "Set N of M · Suggested 80 lb · Why?" so the suggestion stays visible. The Why text button opens W2 for this target. For the first-ever set of an exercise: "Set 1 of 3 · Starting load · Why?".

  **Weight field.** − and + at each end (44 pt hit areas inside the 56 pt field). Increment is the exercise's `increment_kg` converted and rounded (5 lb barbells, 5 lb dumbbells per hand, machine-specific, 2.5 lb where plates allow). Long-press repeats every 150 ms after 400 ms. Tapping the number opens the in-app keypad sheet (below). Bodyweight exercises show "BW" with a + field for added load; assisted show "−assist".

  **Reps field.** Same pattern; increment 1; keypad on tap. Unilateral exercises show "reps / side".

  **RIR field.** Shows the target ("RIR 2") pre-set; tapping cycles a small popover with 0 · 1 · 2 · 3 · 4 · 5+ and **Not sure**. Not sure stores null. In RPE mode the label reads "RPE 8". The field is visually quieter (secondary text) than weight and reps so it never feels mandatory.

  **Complete set.** One tap: persists the PerformedSet, computes e1RM and PR, plays a light haptic, converts the current row to done, advances to the next pending row (or the next exercise's first set if none), prefills the dock from the just-completed set (same load, same reps; RIR back to target), and starts the rest timer. If the set is a PR, the done row gets a small trophy glyph and a success haptic replaces the tick; no modal.

  **Rest timer (inside the dock).** On set completion the context line is replaced by a timer row for the duration of the rest:
  ```
  │ Rest 1:30  ▰▰▰▰▰▰▱▱▱▱   −15   +15   Skip │
  ```
  The three fields and the Complete set button remain visible and editable under it, so the user can set up the next set during rest. Duration comes from the template's rest seconds (editable in the exercise menu for this session). At zero: haptic, optional sound, the row shows "Rest done" for 3 s then returns to the context line. If the app is backgrounded, a local notification fires at the end time ("Rest done · Incline DB Press set 3"). The timer stores an absolute end timestamp; the display is derived from it, so backgrounding never drifts. Auto-start can be turned off in settings; the −15 / +15 / Skip controls are 44 pt.

  **Keypad sheet.** In-app numeric keypad (not the OS keyboard): 3×4 grid of 64 pt keys, decimal, backspace, current value large at top with unit, quick chips for the exercise increment (+2.5, +5, +10 or their kg equivalents), a plate icon that opens the plate calculator for barbell exercises (Phase 1 M5), **Done** 56 pt. Opens in under 100 ms and closes on Done or swipe.

  **Prefill rules (engine + store).** Set 1 of an exercise: engine target (load, reps) from `suggestNextTargets`. Set N>1: previous set's actual load and reps. After a swap: the swapped-in exercise's own history if any, else the engine's estimate from the source exercise (explained). Edits to a done set do not change later prefills already shown unless the user has not touched them.

  **Warm-up sets.** For priority-1 compounds the expanded block shows a one-line "Add 2 warm-up sets (95 × 8, 135 × 5)" text button generated by `suggestWarmups`; tapping inserts them as pending W rows. Warm-ups use a 60 s rest and are excluded from progress counts, PRs, and progression.

  **Supersets.** Template exercises sharing a `superset_group` render as one block with a "Superset" label; set rows alternate A1, B1, A2, B2; the rest timer runs once per pair. Phase 1 M5 renders them; editing groups is in T2.

  **Editing a done set.** Tap the row: it becomes current, the dock loads its values, the Complete button reads **Save**, and a small **Delete set** text button appears in the row. Saving recomputes e1RM/PR and returns the dock to the next pending set.

  **Finishing.** ⋯ → **Finish workout**, or the button that appears in the dock when every planned set is done or skipped: the dock's Complete button becomes **Finish workout** with a secondary "Add set" beside it. Finishing with pending sets shows a confirm sheet: "3 sets not done. Finish anyway?" with **Finish** / **Keep going**. Abandon (⋯ → Discard workout) requires a confirm and keeps nothing.

- **Persistence and recovery.** Every change writes to SQLite synchronously after the UI update. On launch, if a Session is `in_progress`: started < 12 h ago and the app was last in W1 → open W1 directly; otherwise Home shows Resume. Started ≥ 12 h ago → a sheet on Home: "You have an unfinished Upper A from yesterday" with **Finish it** (marks completed with the sets logged) / **Discard**. The screen keeps the display awake while W1 is foreground.

- **Engine and data.** `suggestNextTargets` per exercise at session creation (snapshot stored), `suggestWarmups`, e1RM and PR at each set write, `rankSubstitutes` on swap. No network anywhere.

- **States.** Loading: none visible (session is created before navigation; a 1-frame skeleton at most). Empty: a program day with zero exercises cannot exist; ad-hoc sessions start with an "Add exercise" block. Error: a failed write shows a toast "Couldn't save that set" with Retry and keeps the values in the dock. Offline: identical.

- **Accessibility.** Dock fields are adjustable controls (increment/decrement announce "85 pounds"). Complete set announces "Set 2 logged, 80 pounds, 10 reps. Rest 1 minute 30". The timer row is a live region announcing at 30 s and 0. Every row and button ≥ 44 pt; contrast checked in both themes; the current block has a non-colour indicator (▶ glyph and elevated background).

- **Done when.** With prefilled values a set is one tap. Changing weight by one increment and completing is two taps. On a mid-range Android phone the tap-to-row-update latency is under 100 ms. A killed app resumes to the same set. All of this passes with the lifter group.

### W2 · Why sheet (`WhySheet`)
Renders any `Explanation` (12). Bottom sheet, ~45% height at Tier 1, expands on "Show details".
```
 ┌────────────────────────────────────────┐
 │ ──                                     │  drag handle
 │ Increase to 80 lb                      │  headline (restates the recommendation)
 │ You reached the top of your rep range  │  Tier 1, ≤ 2 sentences
 │ last time with reps to spare.          │
 │                                        │
 │ Last time  75 × 12 · 12 · 12 @ 2 RIR   │  factor row (≤ 3)
 │ Target     8–12 reps @ 1–2 RIR         │
 │                                        │
 │ [ Got it ]              Show details   │
 └────────────────────────────────────────┘
```
Details (Tier 2) adds: "What I looked at" (the sets as rows with dates), "The rule" (name + paragraph), "What would change this" (counterfactual), "Other options" when present, override note when present, then **Learn more** (Tier 3: knowledge items with evidence labels, rule id and engine version in caption text). Closing returns to exactly where the user was. Used from the dock, Home cards, session summary, recommendation detail, history, and swap results.

### W3 · Swap exercise (sheet)
Step 1: "Why swap Incline Dumbbell Press?" six chips in two rows: *Equipment unavailable · Don't like it · Discomfort · Too hard · Too easy · Variety*. Selecting Discomfort shows a one-line caution: "If this is pain rather than discomfort, consider speaking with a professional." Step 2: ranked list, up to five rows: name · similarity badge ("94% similar") · one-line reason ("Same pattern, more stable") · Why? text button (W2 with the ranking Explanation) · tap row to choose. Footer: segmented **Just today** / **Update my program** (default Just today) · **Search all exercises** link for manual choice. Choosing writes the swap to the session (and program if selected), records an ExercisePreference, and the block re-renders with the new exercise, its history, and a fresh target. Undo toast for 5 s.

### W4 · Session menu (sheet)
Rows: Finish workout · Add exercise (opens exercise picker with search, recent, and "in this program" groups) · Reorder exercises (drag handles in a simple list) · Rest timer settings for this session (auto-start toggle, default rest) · Discard workout (destructive, confirm). "I have N minutes" is Phase 2 and is not shown.

### W5 · Session summary
Shown after Finish; full screen, dismissible with **Done**.
```
 ┌────────────────────────────────────────┐
 │ Upper A · Done                         │  title1
 │ 58 min · 14 sets · 3,940 lb lifted     │  callout
 │                                        │
 │ 🏆 New best · Incline DB Press 80 × 10  │  PR banner, subtle fade-in, once
 │    Estimated 1RM 107 lb ↑ 4            │
 │                                        │
 │ NEXT TIME                              │  section header
 │ Incline DB Press   80 → 85 lb    Why?  │  ExplainableValue rows
 │ Lat Pulldown       140 · +1 rep  Why?  │
 │ Seated Cable Row   keep 120      Why?  │
 │ …                                      │
 │                                        │
 │ Add a note about this session          │  text field, optional
 │ [ Done ]                               │
 └────────────────────────────────────────┘
```
Next-time rows come from running `suggestNextTargets` on the just-finished data; they are the same numbers the user will see prefilled next session. If a change is a hold or decrease, the wording is neutral ("keep", "ease to"). One celebration only; no confetti, no streak.

### W6 · Layout A/B test (week 4)
Two throwaway prototypes with identical data and dock: **A** vertical list (this spec), **B** horizontal pager with the same dock. Five to eight testers, two real sessions on each, order counterbalanced. Measured: seconds from set completion to next Complete tap, mis-taps per session, "what's next?" recall question after the session, preference. Decision rule: A stays unless B wins on time *and* preference. Result recorded in 09.

---

## 5. Train

### T1 · Train tab
Segmented control at top: **Program** / **History**.
- *Program*: program name and split as the header with "Change program" ghost button; a list of Program Days in order, the next one marked "Next" with a small accent pill; each row shows name, exercise count, estimated minutes, and last completed date. Tap → T2. A "Start this day" action on any row starts an out-of-order session (allowed; sequential pointer is not advanced by out-of-order sessions unless the user chooses "count as next" in the confirm sheet).
- *History*: month strip with dots on training days, then a list of sessions newest first: day name, date, duration, sets, PR count. Tap → T5. Empty state: "Your sessions will appear here" with Start workout.

### T2 · Program day editor
- Header: day name (editable), estimated minutes (recomputed live).
- List of exercises with drag handles; each row: name, "3 × 8–12 · 1–2 RIR · 1:30 rest", priority badge (Primary / Secondary / Accessory, tap to change). Tap row → inline expansion with steppers for sets, rep range (two values), RIR, rest, and a scheme picker (Double progression / Add weight each session / Add reps) with a one-line description of each. Swap (W3 in program mode), Remove, and "Group with next as superset" in the row menu.
- **Add exercise** at the bottom → picker: search, filters by muscle and equipment, and a "Create custom" entry (name, primary muscle, secondary muscles, movement pattern, equipment, unilateral toggle, increment; nothing else required).
- Every edit persists immediately; a "Changes apply from your next session" caption at the top. Removing a primary exercise shows a one-line note about the muscle it leaves lighter (engine-computed, Phase 1 uses direct sets only).

### T3 · Browse programs
List of templates grouped Recommended for you / All. Each row: name, split, days, minutes, one-line intent. Tap → preview (days with exercises, the intent paragraph, "Why this fits you" or "Why not first" Explanation) → **Switch to this program** with a confirm that history is kept and the pointer restarts at day 1. In onboarding picker mode the primary action is **Choose**.

### T4 · History list — as in T1.

### T5 · Session detail
Header: day name, date, duration, note. Per exercise: target line and the set rows as logged (warm-ups dimmed, PRs marked, swaps noted "swapped from Barbell row · equipment"). Each exercise row has "Why these targets?" → W2 with the stored snapshot Explanation. Tap a set → edit sheet (load, reps, RIR, delete). Session menu: edit date, delete session (confirm), share as text.

---

## 6. Progress

Shared range picker on all Progress screens: **7D · 30D · 90D · 6M · 1Y · All**, default 30D, remembered.

### P1 · Overview
- **Bodyweight** card: current 7-day average large, weekly rate with arrow, sparkline of daily points with the average line; tap → P3.
- **Strength** card: "Strength index +2.1%" (mean e1RM change across primary exercises in range) with a one-line explanation link; list of the four primary exercises with current best e1RM and delta; tap → P2. Hidden until two weeks of data; shows "Log two weeks of workouts to see strength trends" before that.
- **Consistency** row: sessions done vs planned in range, a simple dot grid by week.
- **Records** row: last three PRs with dates; tap → full PR list.

### P2 · Exercise strength detail
Header: exercise name, best set, best e1RM. Chart: e1RM per session as a line with points; tapping a point shows the session's working sets. Below: history list of sessions for this exercise (date, sets). "Why did the target change?" on any session row → W2 from the snapshot. Menu: view exercise info (E1).

### P3 · Body
Bodyweight chart (daily points, 7-day average line, range), entry list with swipe-to-delete, **Log weight** button. Measurements section: sites as rows with last value and delta, "Log measurements" sheet with all sites as numeric fields (blank allowed). Photos: grid by date, **Add photo** (camera or library, pose picker), full-screen viewer with side-by-side compare (two dates). All local.

---

## 7. Exercise detail (E1)
Header: name, primary and secondary muscles as chips, equipment, pattern. Sections: Setup (numbered), Execution (numbered), Cues (bullets), Common mistakes (bullets), Your history (best set, e1RM sparkline, last five sessions), Alternatives (top five from `rankSubstitutes` with reason "variety"). "Add to today's workout" when a session is in progress.

---

## 8. Recommendation detail (R1)
Opened from a Home card or the recommendations list. Same anatomy as the card, full screen: title, Tier 1, factor row, **Apply** / **Keep current**, then Tier 2 content inline (no sheet needed here), and Tier 3 as an expandable section. Applying shows exactly what changed as a list ("Hack squat: 3 sets → 2 sets this week") with an undo toast. Keep current asks nothing further. The list screen ("Suggestions") shows pending, then applied and dismissed with dates, capped and expiring per 09 U8.

---

## 9. Settings
Sections: **Profile** (goal with "Change goal" → chooses among the seven with a note that a new program may be recommended; experience; schedule; equipment for Gym and Home), **Units and display** (lb/kg, cm/in, RIR/RPE, theme System/Light/Dark, advanced mode with a one-line description), **Workout** (rest timer auto-start, sound, haptics, keep screen awake, default rest), **Notifications** (rest timer only in Phase 1), **Data** (Export data as JSON via share sheet, Import, "Backup: your phone's system backup includes this app's data"), **About** (version, crash reporting opt-in toggle with explanation, privacy policy, licences). No sign-in anywhere in Phase 1.

---

## 10. Global patterns

- **Loading**: skeletons matching the final layout; never a full-screen spinner after first launch. First launch shows a branded screen while migrations and seed run (target under 2 s).
- **Empty**: one sentence and one action, no illustrations in Phase 1.
- **Errors**: only local write failures are possible; toast with Retry, values preserved.
- **Permissions**: notifications requested at the first rest timer with the reason in one line; camera/photos at first photo; nothing at onboarding.
- **Haptics**: light on set complete, stepper detent, and timer end; success on PR; none on navigation. Respect the system haptics setting.
- **Celebration**: PR banner on the summary and a trophy glyph on the row. Nothing else.
- **Copy tone**: second person, present tense, no exclamation marks, no blame words, numbers in the user's units, one idea per sentence. Every explanation template lives in `src/engine/explanations` and is snapshot-tested.
- **Theme**: both themes on every screen from M1; the workout screen is designed dark-first because gyms are dim and phones are often on max brightness.

## 11. Tier 1 templates for Phase 1 rules (reference)

| Rule id | Tier 1 text (variables in braces) |
|---|---|
| progression.seed | A conservative starting load. I'll adjust it from your first session. |
| progression.double.increase_load | You reached the top of your rep range last time with reps to spare, so a small increase is due. |
| progression.double.increase_load_large | All sets hit the top of the range with {rir} reps in reserve, so I've added a bit more than usual. |
| progression.double.add_rep | You're inside your rep range. Add a rep before adding weight. |
| progression.double.consolidate | You hit the top of the range but with nothing left, so we'll repeat it before adding weight. |
| progression.hold_after_miss | Last session came in under the range. Same weight today, aiming for the bottom of the range. |
| progression.reduce_load | Two tough sessions in a row. Easing the weight to get you progressing again. |
| progression.linear.increase_load | You hit every rep last time. While that keeps working, we add weight each session. |
| progression.linear.to_double | Two sessions under target, so we'll switch this lift to adding reps before weight. |
| progression.layoff | {days} days since this lift. Starting {percent}% lighter so you can build back safely. |
| progression.bodyweight.add_load | You reached the top of the range at bodyweight, so it's time to add a little weight. |
| progression.calibrate | You've gone up faster than I suggested three times, so I've increased the jumps. |
| substitution.rank | Same movement pattern and the same muscles, using equipment you have. |
| warmup.suggest | Two lighter sets to get to {load} without tiring you out. |
| schedule.sequential.next | This is the next day in your program. Missed days just move on to the next one. |
| schedule.welcome_back | {days} days off, so today's loads are eased by {percent}% to ease back in. |
| program.select | Fits {days} days a week and trains each muscle twice weekly, a good balance of work and recovery. |
