# 05 · Training Engine

The engine is the "Training Rules" layer of the knowledge system: deterministic, pure TypeScript in `packages/engine`, exhaustively unit-tested, and shared by the app and the coach service. Every public function returns a result plus an `Explanation`.

```ts
type Explanation = {
  ruleId: string;              // e.g. "progression.double.increase_load"
  engineVersion: string;
  confidence: "high" | "medium" | "low";
  short: string;               // Tier 1: one or two sentences, ≤ ~180 characters
  factors: Factor[];           // Tier 1 factor row, max 3: { label, value, unit? }
  evidence: EvidenceRef[];     // Tier 2: the sets / sessions / entries the rule used
  rule: { name: string; description: string };          // Tier 2
  counterfactual?: string;     // Tier 2: what would change this decision (required for progression, substitution, compression, deload)
  alternatives?: { label: string; reason: string }[];   // Tier 2: options considered
  overrideNote?: string;       // Tier 2: acknowledges a recent user override
  knowledgeItemIds: string[];  // Tier 3: knowledge base links (07)
};
```

The tiers, writing rules, and UI contract for this object are defined in [12-explainability.md](12-explainability.md). Every rule id must have a hand-written Tier 1 template; a test enumerates rule ids and fails the build if a template is missing or exceeds the length limit.

Rules are versioned. `ruleId` and `engineVersion` are stored in every target snapshot and recommendation so behaviour changes are auditable.

## 1. Inputs the engine sees

`ExerciseHistory` (last N sessions of PerformedSets for an exercise, with targets), `TemplateExercise`, `Profile` + current `Goal`, `EquipmentAccess`, `ExercisePreference[]`, recent `Session` summaries (for fatigue), and optional `RecoveryCheckin`. The engine never reads a database; the app assembles these via repositories.

## 2. Progression (per exercise, per session)

Default scheme is **double progression with RIR awareness**: progress reps inside the range at a fixed load, then increase load and drop back to the bottom of the range. Load-first ("linear_load") is used for beginners on big compounds; rep progression for bodyweight and some isolation work.

### 2.1 Decision procedure (`suggestNextTargets`)

Given the last performance on this exercise (working sets only):

1. **No history** → load = template seed or a conservative estimate (bodyweight-based for beginners, user-entered otherwise); reps = bottom of range; RIR = target. `ruleId: progression.seed`.
2. **Missed or poor last session** (any working set < bottom of range, or average RIR ≤ 0 with reps below range): hold load, target bottom of range. If it happened two sessions in a row → suggest −5 to −10% load (`progression.reduce_load`, medium confidence) and raise a Recommendation.
3. **All working sets hit the top of the range with RIR ≥ target** (e.g. 3×12 @ 2–3 RIR on an 8–12 target) → increase load by one increment (`progression.double.increase_load`). If RIR was ≥ target + 2 on all sets, allow two increments for barbells (`progression.double.increase_load_large`).
4. **Top of range reached but RIR below target** (e.g. 12 @ 0 RIR) → hold load, same reps; note "you hit the top but at 0 RIR, consolidate first" (`progression.double.consolidate`).
5. **Inside the range** → hold load, target reps = last reps + 1 on set 1 if RIR ≥ target, else same reps (`progression.double.add_rep`).
6. **Beginner linear** for primary compounds when experience = beginner and the last session hit all target reps at RIR ≥ 1: add one increment every session regardless of range position (`progression.linear.increase_load`), until two failures, then switch that exercise to double progression automatically and tell the user.
7. **Layoff**: if > 14 days since this exercise was last trained, suggest 90% of last load (`progression.layoff`); > 28 days, 80%.
8. **Bodyweight-loaded movements** (`load_type: bodyweight` or `bodyweight_plus`, e.g. pull-ups, dips): progress reps to the top of the range first; then add external load in the exercise's increment and return to the bottom of the range (`progression.bodyweight.add_load`). Below the bottom of the range with no added load → suggest the regression or an assisted variant (`progression.bodyweight.regress`). Assisted movements progress by reducing assistance (`progression.assisted.reduce`).

**Missing RIR (validated):** RIR is optional. When a set has no RIR, the engine treats it as "at target" and lets reps decide. Rules that depend on RIR (consolidate, "stopping short", large increments) fire only when the user has logged RIR on at least 70% of working sets for that exercise in the window; otherwise the plain rep-based branch applies and the explanation says "based on your reps".

**Minimum data:** progression works from the first session. Stagnation and fatigue rules require at least 4 exposures over at least 3 weeks and say nothing before that.

Per-set targets: set 1 carries the headline target; subsequent sets inherit the previous set's *actual* load and are expected to lose 0–2 reps. The UI prefills set N+1 with set N's values.

### 2.2 Worked examples from the brief

- 75×10 @2, 75×10 @1, 75×9 @1 on an 8–12 target → rule 5: inside the range, RIR near target → hold 75, aim 11 on set 1. Explanation: "You're mid-range at close to your target effort. Add a rep before adding weight."
- 75×12 @3, 75×12 @2, 75×12 @2 → rule 3 → 80. Explanation: "Last session you reached the top of your rep range with 2+ reps in reserve. I'd increase the weight slightly today."
- "Why didn't I increase weight?" with last = 9 @0 RIR, today = 10 @1 RIR → rule 5 fired; the coach can phrase this as progress because both reps and RIR improved.

### 2.3 Override learning
If the user consistently overrides a suggested load upward or downward by the same sign three sessions in a row, the engine adjusts the increment aggressiveness for that exercise (`progression.calibrate`) and says so once.

## 3. Estimated 1RM and PRs

`e1rm = load × (1 + reps/30)` (Epley) for reps ≤ 12; sets above 12 reps are not used for e1RM. PR types: best load at any reps, best reps at a given load, best e1RM. Only working sets count. A PR is flagged at set completion and shown in the session summary.

## 4. Exercise substitution (`rankSubstitutes`)

Candidates: every exercise sharing at least one primary muscle with the source, filtered by the user's available equipment (given the session location) and excluding `avoid`-preference exercises.

Score (0–100, presented as "similarity"):

| Factor | Weight | Notes |
|---|---|---|
| Primary muscle overlap | 35 | Jaccard on primary muscles |
| Movement pattern match | 25 | Same pattern = full; related (e.g. squat ↔ knee_extension) = half |
| Secondary muscle overlap | 10 | |
| Rep-range compatibility | 10 | Template range within the candidate's allowed range |
| Reason-specific adjustment | 20 | See below |

Reason adjustments:
- **Equipment unavailable** — hard filter on equipment; no score change.
- **Don't like it** — prefer different equipment category; mark source `dislike`.
- **Discomfort** — prefer higher stability (machines, supported variants), lower difficulty, and the source's `regression_ids`; show the professional-advice note.
- **Too difficult** — prefer lower difficulty and regressions.
- **Too easy** — prefer higher difficulty and progressions; exclude regressions.
- **Variety** — exclude the source's equipment category and last 2 swaps; mild preference for `alternative_ids`.

Curated `alternative_ids` receive a +10 bonus so hand-picked options usually lead. Top 5 shown. Ties broken by lower fatigue cost when the session is late in the week.

## 5. Volume tracking (`computeWeeklyVolume`)

For each muscle over a rolling 7-day window (or the program week):
- **Direct sets** = working sets of exercises where the muscle is `primary`.
- **Fractional sets** = direct + Σ(secondary contribution × sets). Shown as the secondary figure with a label "including indirect".
- Warm-up, drop, and sets logged at RIR ≥ 5 are excluded.

Display uses the muscle's advisory range (`default_weekly_range`) as a band: **Low** (below min), **In range**, **High** (above max). Copy always says "typical range" and links to the knowledge item explaining that individual needs vary.

## 6. Stagnation (`detectStagnation`)

Per exercise, over the last 4 exposures: no improvement in best e1RM *and* no rep improvement at constant load *and* RIR not decreasing → `stagnant`. Requires ≥ 4 exposures and ≥ 3 weeks. Emits a Recommendation of type `info` with candidate causes, ordered by what the data supports:
1. Volume for the muscle below its range → `increase_volume`.
2. Volume above range and other exercises for the muscle also stagnant → `reduce_volume` or `deload`.
3. RIR reported ≥ 3 consistently → "you may be stopping short" (info).
4. Otherwise → suggest a variation swap (`swap_exercise`, reason variety), low confidence.

Bodyweight trend flat during a bulk is surfaced separately (Phase 3) and cross-referenced.

## 7. Fatigue and deload (`assessFatigue`)

Signals over the last 2 weeks, each scored 0–1 and combined:
- Performance decline across ≥ 3 different exercises (e1RM down vs prior 2 weeks)
- RIR drift: reported RIR decreasing at unchanged loads
- Session RPE / readiness check-ins (Phase 3), sleep hours (Phase 3)
- Sessions abandoned or heavily compressed
- Weeks since last deload vs `deload_every_weeks`

Score ≥ 0.6 → Recommendation `deload` (one week at ~60% of working sets, same loads, RIR 3–4). Score 0.4–0.6 → `reduce_volume` (drop one set from accessories). Explanations list the exact signals. Confidence is `medium` at most; the copy says "signs point to accumulated fatigue" rather than asserting it.

## 8. Session compression (`compressSession`)

Input: the day's template, the available minutes, and rest times. Estimated duration = Σ sets × (avg set time 45 s + rest) + transitions. Reduce until it fits:
1. Drop sets from `priority 3` exercises (keep ≥ 1 set).
2. Shorten rest on isolation work to a 60 s floor.
3. Remove `priority 3` exercises entirely.
4. Drop one set from `priority 2` exercises.
5. Never remove `priority 1` exercises; if it still doesn't fit, warn.
The result is recorded in `Session.modifications` and explained ("removed two lower-priority isolation sets, kept your primary movements").

## 9. Program selection (`selectProgram`)

Deterministic mapping from profile to catalog template:

| Days/week | Beginner | Intermediate | Advanced |
|---|---|---|---|
| 2–3 | Full Body 3x | Full Body 3x (higher volume) | Full Body / Upper-Lower hybrid |
| 4 | Upper/Lower 4x | Upper/Lower 4x | Upper/Lower 4x |
| 5 | Upper/Lower 4x + optional day | Upper/Lower + Arms or PPL+UL | 5-day hypertrophy |
| 6 | Upper/Lower 4x (advised) | PPL 6x | PPL 6x |

Goal adjusts rep ranges and priorities: `get_stronger` → primary lifts 3–6 reps, `general_fitness` → shorter sessions and fewer sets, `lose_fat` → same hypertrophy structure with a note that nutrition drives fat loss. Session length trims accessories using the compression rules. Equipment filters exercises at copy time using the substitution ranker. The rationale text is assembled from the factors used.

## 9b. Today's workout and missed days (`resolveTodaysWorkout`)

Input: the active program, its scheduling mode and pointer, the last completed session date. Output: one of `train(day)`, `rest`, `welcome_back(day, layoffDays)`, each with an Explanation.
- Sequential: next unfinished day. Weekday-pinned: today's mapped day, or `rest` with "Do the next day anyway" available.
- Two sessions on the same local date are allowed but the second is flagged so progression does not double-count.
- Layoff ≥ 5 days: `welcome_back`; loads for that session pass through the layoff rule and the Home card says so in one sentence.
- Layoff ≥ 28 days: additionally suggest restarting the program from day 1 (recommendation, not automatic).

## 9c. Warm-up generation (`suggestWarmups`)

For priority-1 compounds with a working load above a threshold (e.g. ≥ 40 kg barbell): sets at ~50% × 8, ~70% × 5, ~85% × 2, rounded to the exercise increment; fewer sets for lighter loads; none for isolation work. Warm-ups are excluded from progression and volume. Explanation is one line ("Two warm-ups to get to 185 lb without fatigue").

## 10. Adaptive programming (Phase 3)

Program-level proposals from multi-week data, each as a Recommendation with Apply / Keep:
- Muscle consistently Low with stagnant lifts → add 2 sets/week to that muscle across days.
- Muscle High with declining performance → remove 2 sets/week.
- Exercise swapped for discomfort twice → replace in program permanently.
- Consistency < 60% for 3 weeks → propose a program with fewer days.
- Goal change → propose a matching program; keep exercise history.

## 11. Testing strategy

Fixture-driven: JSON histories describing scenarios (fresh, progressing, plateau, layoff, override patterns, fatigue) with expected `ruleId` and targets. Property tests: suggested load never changes by more than 2 increments per session; compression never removes priority 1; substitution never returns unavailable equipment. Snapshot tests on explanation text.
