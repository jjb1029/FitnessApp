# 11 · Critical Review of the Architecture

Status: **proposals for validation.** Items marked **[proposed change]** are not yet applied to the other documents; the explainability changes in 12 have been applied because they were requested.

## 1. Major risks

### R1 · The workout screen layout (highest risk)
Document 02 chose a horizontal pager with one exercise per page. On reflection that is the wrong default and the most consequential UX decision in the product:
- A pager hides the session. Lifters constantly glance ahead ("what's next, how much is left") and back ("what did I do on set 2 of the last exercise"). Progress dots do not replace that.
- Supersets and circuits span exercises; a pager makes them a special case with awkward navigation.
- Swiping is fragile with sweaty hands and gloves, and horizontal swipe fights with the tab gesture on Android.
- The apps lifters already love (Strong, Hevy) use one scrolling list, and switching users bring that muscle memory.

**[proposed change]** Single vertical list of exercises. The current exercise is expanded with its set rows; all others collapse to a one-line summary (name, sets done/total, last load). A **sticky input dock** at the bottom holds Weight / Reps / RIR / Complete Set for the current set, so the thumb never moves and the list scrolls underneath. Tapping a collapsed exercise makes it current. Build both layouts as throwaway prototypes in week 4 and test with the lifter group; keep the one that logs a set faster with fewer mis-taps.

### R2 · Requiring RIR will produce bad data or abandonment
Many lifters will not log RIR consistently, and those who do misreport it. The engine as written assumes RIR is present.
**[proposed change]** RIR is optional and pre-set to the target; one tap changes it. The engine treats a missing RIR as "target reached" for progression (reps decide) and never emits RIR-dependent recommendations (consolidate, "stopping short") unless the user has logged RIR on at least 70% of sets for that exercise. Add this to 05 §2 and a fixture set.

### R3 · Recommendation fatigue
A recommendation inbox on Home, engine-generated recommendations, and later a coach that proposes actions can become a nagging machine. Users learn to dismiss everything, and then the explainability work is wasted.
**[proposed change]** Hard limits: at most one recommendation card on Home; at most three pending overall (new ones supersede lower-priority ones); recommendations expire after two weeks; no push notifications for recommendations. Load targets are never recommendations; they are just the prefilled numbers with a "Why?".

### R4 · Missed and shifted days are undefined
The data model has program days in order but no rule for "what is today's workout" when the user trains Monday, skips Wednesday, and opens the app Friday. This is the most common real-world situation and it is missing.
**[proposed change]** Programs are **sequential by default**: today's workout is the next uncompleted day in order, whatever the weekday. Optional weekday pinning for users who want it. Home offers "Do this later" (keeps order), "Skip this day" (advances), and, after 5+ days away, a one-line "Welcome back" with the layoff rule applied to loads. Add `scheduling_mode` to Program and this logic to the engine.

### R5 · Onboarding asks for personal data before showing value
"About you" (age, sex, height, weight) is screen two. None of it changes program selection much, and it feels like a medical form to exactly the users the brief wants to protect.
**[proposed change]** Order: Goal → Experience & schedule → Equipment & place → **Recommendation** → "A couple of details to personalise" (bodyweight required for trends, the rest optional, all skippable). Likes/dislikes only for intermediate+ users, phrased "Anything you'd rather avoid?" with at most twelve chips. Limitations become a single optional chip row. Target drops from seven screens to five before the user sees their program.

### R6 · Coach cost and latency
Streaming a large model with a 6–8k-token snapshot and a 20k-token cached knowledge prefix is fine for a few thousand users but the cost is real, and one runaway user can generate hundreds of turns. The design has per-user caps; it needs them enforced server-side before the first external tester touches the coach. Also evaluate a smaller model for routine chat turns with the eval set (a decision for you, not a default I will make silently).

## 2. Unnecessary complexity for an MVP

| Item | Why it is unnecessary now | **[proposed change]** |
|---|---|---|
| pnpm monorepo with `apps/` and `packages/` | Expo and Metro tolerate monorepos but they add config, symlink, and hoisting friction, and there is no second consumer of the engine until the backend exists in Phase 2 | Single Expo app; `src/engine`, `src/domain`, `src/knowledge` folders with ESLint import boundaries. Extract to packages when the coach function is built |
| Outbox table and `SyncService` in Phase 1 | No backend in Phase 1 (see 10) | Keep `updated_at`, `deleted_at`, `version` columns; add outbox with sync in Phase 2 |
| Auth, RLS, account deletion in Phase 1 | Same | Move to Phase 2 with the backend; keep JSON export/import in Phase 1 |
| pgvector, embeddings, index function | KB is small (see 10) | Bundle knowledge JSON into the app and the coach prompt |
| Skia-based charts | Native Skia dependency for three simple chart types | One-day spike in M1: victory-native vs a pure-JS SVG chart library; pick the simpler one that renders well in dark mode |
| Sentry plus product analytics in M6 | Two SDKs, two consent flows | Crash reporting only in Phase 1; product analytics later if a question needs it |
| Derived cache table | Premature | Compute derived data in memory per screen; add a cache when profiling shows a need |
| Tablet list-detail layouts in Phase 1 | Tiny share of gym use | Phones first; ensure nothing breaks on tablets; proper tablet layouts in Phase 2 |
| Seven program templates at M1 | Each template is real content work | Ship four (Full Body 3x, Upper/Lower 4x, PPL 6x, Beginner Full Body) at M1; add Upper/Lower + Arms, 5-day, and strength-focused by M5 |

## 3. Missing pieces

- **Bodyweight-loaded exercise progression** (pull-ups, dips, push-ups): reps progress first, then added load; assisted movements progress by reducing assistance. Needs its own rule branch in 05 and `added_load_kg` handling in the UI.
- **Unilateral exercises**: log per side or "per side" reps; data model needs a `side` (`left`, `right`, `both`) on PerformedSet or a convention that reps are per side. Decide: reps are per side, no per-side rows, unless the user opts into per-side logging on the exercise.
- **Supersets in the UI**: `superset_group` exists in the model but no flow. With the vertical list layout it is a grouped block with shared rest.
- **Warm-up guidance**: auto-generated warm-up sets from the working load for priority-1 compounds (e.g. 50% × 8, 70% × 5, 85% × 3). Small effort, high perceived intelligence, and it feeds explainability ("Why these warm-ups?").
- **Plate calculator**: tap the load, see plates per side for the user's bar and plate set. Loved feature; half a day.
- **Deload execution**: what "Apply" on a deload recommendation actually does to the next week's targets (sets × 0.6, RIR +2, same loads) and how the week is labelled in the UI.
- **Editing history**: edit or delete a set or session after the fact, with derived data recalculated.
- **Custom exercises**: creating one requires tagging muscles and a pattern so the engine can use it; needs a compact UI (primary muscle picker, pattern picker, equipment).
- **Import from other apps** (Strong and Hevy CSV): the fastest way to give a switching user personalised targets on day one. Phase 2, but the data model should accept sessions with no program and no template (it does).
- **Time zones and midnight**: `local_date` at write time is defined; a session that starts at 23:50 and ends at 00:30 belongs to its start date. State this rule.
- **Localisation scaffolding**: English only at launch, but all strings should go through one function from day one so translation is a content task later, and unit/number/date formatting uses the locale.
- **Notification permission timing**: ask for notification permission at the first rest timer, not at onboarding, with a one-line reason.
- **Empty-history guards**: stagnation and fatigue rules must not fire in the first three weeks; the docs imply this, the engine should enforce minimum exposures explicitly.
- **Exercise illustrations**: text-only instructions are weak for beginners. Plan a simple, consistent line-illustration set for the 60 most common exercises before public launch; it is content, not code.

## 4. Things that could become major problems later

- **Engine rule changes silently altering targets.** Every target snapshot stores `ruleId` and `engineVersion` (already designed). Add a rule: an engine version bump that changes suggestions for existing users ships with a one-time "We updated how we calculate targets" note and a way to see the previous suggestion.
- **Exercise catalog identity.** Slugs must never change once shipped; renaming is a display-name change plus aliases. Merging duplicates needs a redirect table. Decide this before the seed ships.
- **Schema migrations on device.** SQLite migrations with user data are unforgiving. Adopt: additive migrations only, never drop columns in Phase 1–2, always test migration from every shipped schema version in CI.
- **Unit rounding drift.** Storing kg and displaying lb with rounding can display 75 lb, store 34.02 kg, and later display 74.99 lb if rounding is inconsistent. Round at display time to the exercise increment, always, and store the user-entered value and unit alongside the canonical kg for audit.
- **Prompt cache invalidation.** Anything volatile (timestamps, the snapshot) placed before the cache breakpoint silently multiplies coach cost. The 06 ordering is right; add a usage assertion to the eval (`cache_read_input_tokens > 0` on the second turn).
- **Vendor coupling in the coach.** Keep the coach function's model call behind a small adapter so the model, effort, and provider can change without touching prompt logic.

## 5. What I would simplify for the MVP (summary of proposed changes)

1. Single Expo app, no monorepo.
2. No backend, auth, or sync in Phase 1; JSON export/import instead.
3. Four program templates at launch, seven by M5.
4. Vertical-list workout layout with a sticky input dock (validate against the pager with real lifters).
5. Five onboarding screens before the recommendation appears.
6. RIR optional everywhere.
7. Knowledge base bundled, no retrieval infrastructure.
8. Crash reporting only; no analytics SDK.
9. Charts: pick the simpler library after a one-day spike.

## 6. Assumptions worth challenging

| Assumption | Challenge | Suggested stance |
|---|---|---|
| Users think in "programs" | Beginners think in "today's workout". The program is our structure, not their mental model | Home never says "program"; it says "Today: Upper A · 55 min". Program management lives in Train for those who want it |
| Double progression suits everyone | Some want fixed linear loading, some want RPE-based autoregulation | Keep double progression as the default, allow per-exercise scheme, and let "Why?" show what the scheme is |
| A chat interface is the right coach | 80% of the value may be "Why?" on every number plus proactive recommendation cards; chat is expensive and open-ended | Build explainability and recommendation cards first (Phase 1–2); chat late in Phase 2 once there is real data to talk about |
| Opus-class model for every turn | Routine "why" turns are grounded by the snapshot and could run on a cheaper model | Evaluate with the eval set; make it a deliberate decision with numbers |
| A seven-day week structure | Shift workers and travellers do not train on a weekly grid | Sequential scheduling by default (R4) |
| 150 exercises is enough | Probably yes for the engine; not for search expectations ("Where is the Hammer Strength row?") | Aliases and brand names on catalog items; easy custom exercises |
| People will read explanations | They will read one sentence, sometimes two | 12 enforces sentence limits per tier |
| The app must be premium and calm | True, but "calm" must not become "flat and forgettable". PRs and finishing a session deserve a moment | One tasteful celebration on PR and session finish; nothing else |

## 7. Where the product can be substantially different

1. **Explainability as the interface** (12). No mainstream tracker explains its numbers; most do not produce numbers at all. "Why?" on every target, every swap, every change, in one sentence, with depth on demand, is the brand.
2. **Counterfactuals.** "What would make you increase the weight?" answered concretely ("Get 12 reps on all three sets at 2 RIR"). Turns the app into a goal for the next session, not just a log.
3. **Missed-session intelligence** (R4). "You've been away 9 days, I've eased today's loads by 10%" is a moment of care no competitor delivers.
4. **Time-boxed sessions.** "I have 40 minutes" producing a sensible compressed session, explained, is rare and useful.
5. **Override learning.** The app calibrates increments to the user's actual behaviour and says so once.
6. **Gym profiles.** "Home" and "Gym" equipment sets; "Different gym today" swaps everything unavailable in one tap, with reasons.
7. **Honest volume bands with evidence labels**, instead of a single "optimal" number.
8. **Weekly review** (Phase 2). One screen on the rest day: what got stronger, what stalled, one suggestion, one sentence each.
9. **Import with instant personalisation.** Switching users get progression targets from their existing history on day one.
10. **A coach that only speaks from your data.** Every number traceable to a set you logged or a rule you can read.
