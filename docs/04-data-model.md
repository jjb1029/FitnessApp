# 04 · Data Model

All entities live in SQLite on device (Drizzle schema in `apps/mobile/src/data/schema`) and are mirrored one-to-one in Postgres for backup and sync. Types and Zod schemas live in `packages/domain` and are the single source of truth for both.

Conventions: `id` is UUID v7 text. Every user-owned table has `user_id`, `created_at`, `updated_at`, `deleted_at`, `version`. Enumerations are stored as text and validated by Zod. JSON columns are used only for genuinely variable structures (explanations, integration payloads) and are typed at the boundary.

## 1. Entity map

```
User ─┬─ Profile ── Goal (current) ── BodyCompPhase
      ├─ EquipmentAccess[]
      ├─ ExercisePreference[] ──────────────► Exercise ◄── ExerciseMuscle[] ── Muscle
      ├─ Program (active) ── ProgramDay[] ── TemplateExercise[] ── TemplateSet[]
      ├─ Session[] ── SessionExercise[] ── PerformedSet[]
      ├─ BodyweightEntry[]  Measurement[]  ProgressPhoto[]
      ├─ NutritionDay[]  ActivityDay[]  RecoveryCheckin[]
      ├─ Recommendation[]
      ├─ CoachConversation[] ── CoachMessage[]
      └─ Integration[]
Reference data: Exercise, Muscle, Equipment, ProgramTemplate (catalog)
```

## 2. Reference data (shipped, versioned, user-extendable)

### Muscle
| Field | Type | Notes |
|---|---|---|
| id | text | e.g. `chest`, `lats`, `upper_back`, `front_delts`, `side_delts`, `rear_delts`, `biceps`, `triceps`, `forearms`, `quads`, `hamstrings`, `glutes`, `adductors`, `calves`, `abs`, `obliques`, `spinal_erectors`, `traps`, `neck` |
| name | text | |
| group | text | `upper_push`, `upper_pull`, `legs`, `core`, `arms` (display grouping) |
| default_weekly_range_min / max | int | Advisory set range used by volume UI (e.g. 10–20), sourced from knowledge items |

### Equipment
`id`, `name`, `category` (`barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `band`, `kettlebell`, `smith`, `specialty`), `default_increment_kg`.

### Exercise
| Field | Type | Notes |
|---|---|---|
| id | text | Stable slug for catalog items; UUID for user-created |
| name, aliases[] | text | |
| movement_pattern | text | `horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `squat`, `hinge`, `lunge`, `knee_extension`, `knee_flexion`, `hip_abduction`, `elbow_flexion`, `elbow_extension`, `shoulder_abduction`, `shoulder_transverse`, `calf_raise`, `trunk_flexion`, `carry`, `other` |
| category | text | `compound`, `isolation` |
| equipment_ids[] | text | Any-of requirement (e.g. dumbbell + bench) |
| laterality | text | `bilateral`, `unilateral` |
| load_type | text | `external`, `bodyweight`, `bodyweight_plus`, `assisted` |
| stability | int 1–5 | 1 = machine-stabilised, 5 = free/unstable |
| difficulty | int 1–5 | Technical skill needed |
| fatigue_cost | int 1–5 | Approximate systemic fatigue per hard set |
| rep_range_default | {min,max} | e.g. 8–12 |
| rep_range_allowed | {min,max} | e.g. 5–20 |
| increment_kg | real | Practical load increment |
| instructions | {setup[], execution[], cues[], common_mistakes[]} | JSON, text arrays |
| progression_notes, regression_ids[], alternative_ids[] | | Curated alternatives seed the substitution ranker |
| is_custom, created_by_user_id | | User-created exercises |
| catalog_version | int | For seed upgrades |

### ExerciseMuscle
`exercise_id`, `muscle_id`, `role` (`primary`, `secondary`), `contribution` (real 0–1; primary = 1.0, secondary defaults 0.5). Used for volume counting (05).

### ProgramTemplate (catalog)
Same shape as Program + ProgramDay + TemplateExercise but immutable and versioned; copying one creates a user Program.

## 3. User and profile

### User
`id`, `auth_user_id` (nullable until sign-in), `created_at`, `settings` JSON (`unit_weight: lb|kg`, `unit_length`, `intensity_scale: rir|rpe`, `theme`, `rest_timer_sound`, `haptics`, `advanced_mode: bool`).

### Profile
| Field | Notes |
|---|---|
| user_id, birth_date, sex (`male`, `female`, `unspecified`), height_cm | |
| training_experience | `beginner` (<1y), `intermediate` (1–4y), `advanced` (4y+) |
| days_per_week, session_minutes | |
| training_location | `gym`, `home`, `both` |
| activity_level | `sedentary`…`very_active` |
| limitations | text[] of chips + free text |
| dietary_preference | text, Phase 3 |

### Goal
`id`, `user_id`, `type` (`build_muscle`, `lose_fat`, `recomp`, `get_stronger`, `general_fitness`, `maintain`, `athletic_performance`), `is_current`, `started_at`, `ended_at`. Goal history is kept; the engine reads the current goal.

### BodyCompPhase (Phase 3)
`goal_id`, `phase` (`cut`, `maintain`, `lean_bulk`, `recomp`), `target_rate_kg_per_week`, `target_weight_kg`, `target_date`, `calorie_target`, `protein_target_g`, `confirmed_at`.

### EquipmentAccess
`user_id`, `equipment_id`, `location` (`gym`, `home`), `available` (bool). Substitution and program selection filter on this.

### ExercisePreference
`user_id`, `exercise_id`, `sentiment` (`like`, `dislike`, `avoid`), `reason` (`equipment`, `dislike`, `discomfort`, `too_hard`, `too_easy`, `variety`), `note`, `created_at`. Every swap writes one of these so preferences accumulate from behaviour.

## 4. Programs

### Program
`id`, `user_id`, `name`, `template_id` (nullable), `split` (`full_body`, `upper_lower`, `ppl`, `upper_lower_arms`, `body_part`, `custom`), `days_per_week`, `goal_type`, `description`, `rationale` (why it was recommended), `explanation` (full `Explanation`), `is_active`, `started_at`, `scheduling_mode` (`sequential` default, `weekday`), `weekday_map` JSON (nullable: program_day_id → weekday), `next_day_index` (sequential pointer, advanced on completion or skip), `deload_every_weeks` (nullable).

**Today's workout** = for `sequential`: the day at `next_day_index`, skipping `is_rest` days; for `weekday`: the day mapped to today, else "Rest day" with the option to do the next unfinished day. Completing or skipping a day advances the pointer; "Do later" leaves it.

### ProgramDay
`id`, `program_id`, `order`, `name` ("Upper A"), `focus_muscle_ids[]`, `estimated_minutes`, `is_rest` (bool).

### TemplateExercise
`id`, `program_day_id`, `order`, `exercise_id`, `priority` (1 = primary, 3 = accessory; drives compression), `rep_range_min/max`, `target_rir`, `rest_seconds`, `progression_scheme` (`double_progression`, `linear_load`, `rep_progression`, `custom`), `notes`, `superset_group` (nullable).

### TemplateSet
`id`, `template_exercise_id`, `order`, `set_type` (`working`, `warmup`, `backoff`, `drop`), `rep_range_min/max` (nullable override), `target_rir` (nullable override). Most exercises have N identical working sets, stored as rows so per-set overrides are possible.

## 5. Sessions (what actually happened)

### Session
| Field | Notes |
|---|---|
| id, user_id, program_id, program_day_id (nullable for ad-hoc) | |
| name | Snapshot of the day name |
| status | `in_progress`, `completed`, `abandoned` |
| started_at, ended_at, local_date | |
| readiness | JSON (Phase 3): energy, soreness, sleep |
| modifications | JSON: `{ compressed_to_minutes?, swaps: [...] }` |
| notes | |
| summary | JSON computed at finish: total sets, volume load, PRs[], duration |

### SessionExercise
`id`, `session_id`, `order`, `exercise_id`, `template_exercise_id` (nullable), `substituted_from_exercise_id` (nullable), `substitution_reason`, `target_snapshot` JSON (rep range, RIR, rest, suggested load, suggested reps, and the full `Explanation` object from 12), `skipped` (bool), `notes`.

The target snapshot is stored so history shows what the engine suggested at the time even after program edits.

### PerformedSet
| Field | Notes |
|---|---|
| id, session_exercise_id, order | |
| set_type | `working`, `warmup`, `backoff`, `drop` |
| load_kg | real, canonical; nullable for pure bodyweight |
| entered_load, entered_unit | what the user typed and in which unit, for audit and exact redisplay |
| added_load_kg | for weighted bodyweight; assisted uses negative |
| reps | int; for unilateral exercises reps are **per side** by convention (one row per set, not per side) |
| rir | real, nullable; optional everywhere, pre-set to target in the UI |
| completed_at | |
| suggested_load_kg, suggested_reps | What was prefilled; the delta is the override signal |
| e1rm_kg | Computed at write (Epley by default; formula id stored) |
| is_pr | bool, computed at write against per-exercise bests |
| notes | |

## 6. Body and lifestyle

### BodyweightEntry — `id`, `user_id`, `weight_kg`, `measured_at`, `local_date`, `source` (`manual`, `apple_health`, `health_connect`, `fitbit`…), `external_id`.

### Measurement — `id`, `user_id`, `site` (`waist`, `chest`, `hips`, `left_arm`, `right_arm`, `left_thigh`, `right_thigh`, `neck`, `shoulders`, `calf`), `value_cm`, `measured_at`, `local_date`.

### ProgressPhoto — `id`, `user_id`, `taken_at`, `local_date`, `pose` (`front`, `side`, `back`), `file_uri`, `remote_path` (nullable), `bodyweight_entry_id` (nullable).

### NutritionDay (Phase 3) — `user_id`, `local_date`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `source`, `is_complete` (bool), `external_id`. One row per day per source; the app picks the preferred source.

### ActivityDay (Phase 3) — `user_id`, `local_date`, `steps`, `active_energy_kcal`, `source`.

### RecoveryCheckin (Phase 3) — `user_id`, `local_date`, `sleep_hours`, `sleep_quality` 1–5, `soreness` JSON per muscle 1–5, `stress` 1–5, `energy` 1–5.

## 7. Intelligence

### Recommendation
| Field | Notes |
|---|---|
| id, user_id | |
| type | `load_target`, `rep_target`, `add_set`, `remove_set`, `swap_exercise`, `deload`, `reduce_volume`, `increase_volume`, `change_program`, `calorie_adjust`, `compress_session`, `info` |
| scope | JSON reference: `{ exerciseId?, templateExerciseId?, programDayId?, programId?, muscleId? }` |
| title, summary | Plain language |
| explanation | JSON: the full `Explanation` object from 12 (ruleId, engineVersion, short, factors, evidence, rule, counterfactual, alternatives, knowledgeItemIds), stored so "Why?" works offline and survives engine upgrades |
| payload | JSON: the concrete change to apply (typed per `type`) |
| source | `engine`, `coach` |
| confidence | `high`, `medium`, `low` |
| status | `pending`, `applied`, `dismissed`, `expired`, `superseded` |
| created_at, resolved_at, expires_at | |

Load and rep targets for the *next session* are computed on demand by the engine and cached in `SessionExercise.target_snapshot`; they are not stored as Recommendations unless they deviate from the default scheme in a way the user should notice (e.g. "Reduce load 10% after two missed sessions").

### CoachConversation — `id`, `user_id`, `title`, `created_at`, `last_message_at`.
### CoachMessage — `id`, `conversation_id`, `role` (`user`, `assistant`, `system_note`), `content` (text), `proposed_actions` JSON (array of Recommendation-shaped objects with their ids once persisted), `context_snapshot_hash`, `model`, `usage` JSON, `created_at`.

### Integration
`id`, `user_id`, `provider` (`apple_health`, `health_connect`, `fitbit`, `garmin`, `myfitnesspal`, `cronometer`), `status` (`not_connected`, `connected`, `error`, `revoked`), `scopes[]`, `last_sync_at`, `error_message`. A row exists only after the user starts connecting. UI reads absence as "not connected".

## 8. Sync metadata (Phase 2)

Phase 1 ships only the per-row columns (`updated_at`, `deleted_at`, `version`). Phase 2 adds:
### outbox — `id`, `table_name`, `row_id`, `op` (`upsert`, `delete`), `payload` JSON, `created_at`, `attempts`, `last_error`.
### sync_state — `table_name`, `last_pulled_at`, `last_pushed_at`.

## 9. Derived data (never stored as truth)

Computed by the engine from the tables above, memoised in memory or in a `derived_cache` table with an invalidation key:
- Per-exercise best set, best e1RM, and PR timeline
- Weekly sets per muscle (direct and fractional)
- Bodyweight 7-day moving average and weekly rate of change
- Consistency: sessions completed vs planned per week
- Strength index: mean e1RM change across the program's primary exercises over a window

## 10. Indexes that matter

`performed_set(session_exercise_id, order)`, `session(user_id, local_date)`, `session_exercise(session_id, order)`, `session_exercise(exercise_id)` (per-exercise history), `bodyweight_entry(user_id, local_date)`, `recommendation(user_id, status)`, `outbox(created_at)`.
