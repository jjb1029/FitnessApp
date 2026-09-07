# 01 · Product Architecture

## 1. Product thesis

Most workout trackers are ledgers. They record what happened and leave the thinking to the user. Forma inverts this: the user states a goal and constraints, and the app decides what to do next, explains why, and adapts as data comes in. Logging is the *input* to the system, not the product.

**Central promise:** "Tell the app what you want to accomplish. The app handles the complexity."

**What "handles the complexity" means concretely:**

| The user says or does | The system does |
|---|---|
| Picks a goal, experience, schedule, equipment | Selects and configures a program, explains it in plain language |
| Logs a set (weight, reps, RIR) | Decides next session's load/reps target and explains the decision |
| Swaps an exercise | Ranks alternatives that preserve the muscle and movement stimulus |
| Says "I only have 40 minutes" | Compresses the session, keeping the highest-priority sets |
| Shows declining performance across sessions | Flags fatigue, proposes a volume reduction or deload |
| Logs bodyweight over weeks | Reports trend and rate of change, suggests nutrition adjustments for confirmation |
| Asks the coach "why" | Answers from actual data plus curated knowledge, in plain English, with honest uncertainty |

## 2. Who it is for

Primary persona, in priority order:

1. **The committed intermediate** (1–4 years lifting, trains 3–5x/week, has a gym). Knows what a rep range is, does not want to program. Wants progression handled and wants to see progress. This persona drives every MVP decision.
2. **The motivated beginner** (0–12 months). Needs a program picked for them, exercise instruction, and confidence. Progressive disclosure protects them from jargon.
3. **The advanced lifter** (4+ years). Wants full control: custom programs, RIR everywhere, volume per muscle, e1RM trends. Must never feel the app is hiding data. Not the MVP focus but the architecture must not block them.

Explicitly **not** the target at launch: endurance athletes, sport-specific periodisation, powerlifting meet prep, physique competition prep.

## 3. The core loop

Everything in the product serves one loop that repeats every training day:

```
  PLAN ─────► DO ─────► RECORD ─────► LEARN ─────► (back to PLAN)
  "Here is    Fast set   Sets, RIR,    Progression,
   today"     logging    notes         volume, fatigue,
                                       bodyweight trend
```

- **PLAN** is the Home screen and the pre-workout view. It answers "what am I doing today and why."
- **DO / RECORD** is the workout screen. It must be the fastest, most reliable surface in the app and must work offline.
- **LEARN** is the training engine plus the coach. It turns records into the next plan and into explanations.

Any feature that does not strengthen this loop is deferred.

## 4. Feature scope by phase

Scope is decided by the question "does this make the user's fitness journey easier?" and by whether it strengthens the core loop.

### Phase 1 — A complete, honest strength-training companion
- Account (optional, deferrable) and local-first data
- Conversational onboarding → recommended program
- Exercise database (seed ~150 exercises, structured)
- Prebuilt programs (7 templates) with light editing (swap, reorder, sets, rep range, rest)
- Workout logging with rest timer, previous performance, and per-set targets
- Progression engine v1 (explainable double progression with RIR)
- Exercise substitution v1 (reason-aware ranking)
- Workout history and per-exercise history
- Progress: bodyweight trend, strength (e1RM) per exercise, PRs, consistency
- Home with today's session, progress summary, and rule-based recommendations

### Phase 2 — Intelligence
- Full program builder (custom programs, days, templates)
- Volume tracking per muscle group with ranges and trends
- Stagnation and fatigue detection; deload suggestions
- Recommendation inbox with Apply / Keep current
- AI coach (chat with real data, knowledge retrieval, proposed actions)
- Session compression ("I only have 40 minutes")

### Phase 3 — The wider journey
- Health platform integrations (Apple Health, Health Connect) for bodyweight, steps, and nutrition where available
- Nutrition dashboard and energy-balance analysis; body composition phases (cut/maintain/lean bulk/recomp)
- Recovery inputs (sleep, soreness, readiness) feeding the fatigue model
- Adaptive programming (engine proposes program-level changes from multi-week trends)
- Cloud sync across devices

## 5. What we deliberately do not build

- A food database or barcode scanner. Nutrition data comes from integrations. Building a food database is a separate product.
- Social feeds, leaderboards, streaks-as-pressure, badges for their own sake. Achievements are limited to meaningful training milestones (PRs, consistency).
- Wearable live heart-rate views, GPS runs, cardio programming beyond a simple "cardio session" log. Cardio is recorded so it can inform recovery and energy balance, not coached.
- Video exercise library at launch. Text setup + cues first; static illustrations later; video is a content project.
- A web app. Expo web may be enabled for internal testing only.

## 6. Product rules (non-negotiable)

1. **Explainability is a first-class UX feature.** Every meaningful recommendation (load, reps, sets, swaps, session changes, deloads, program and goal proposals) carries a "Why?" one tap away. The default explanation is one or two plain sentences; details, data, rules, and knowledge sources are available in deeper tiers for those who want them. Explanations come from the rule that fired, not from free-form AI text. See [12-explainability.md](12-explainability.md).
2. **Nothing changes without the user seeing it.** Load suggestions are pre-filled but editable. Program changes are proposals with Apply / Keep.
3. **The user can always override**, and the system learns from overrides (an override is data, not an error).
4. **No fake integrations.** If Apple Health is not connected, the UI says so and offers to connect. Demo data is clearly labelled and only in dev builds.
5. **Honest uncertainty.** Volume landmarks are ranges. Substitution "match %" is labelled as a similarity score. The coach distinguishes established knowledge from recommendation from uncertainty.
6. **Medical boundary.** Injury, pain, medication, eating-disorder, or medical questions get a safe response and a referral to a professional. The app never diagnoses.
7. **Offline is a first-class state**, not an error state, for everything in the core loop.
8. **Progressive disclosure.** RIR, e1RM, volume, and rule internals exist for everyone but are surfaced in layers.
9. **Simplify infrastructure and breadth, never the core loop.** When the MVP must shrink, cut servers, integrations, tabs, and templates. Never cut the training engine, the explanation system, the offline database, or the data model.

## 7. Success measures (what "working" means)

- A returning user can start today's workout in ≤ 2 taps from cold launch.
- A set is logged in 1 tap when the suggestion is accepted (weight and reps prefilled), ≤ 3 taps otherwise.
- 100% of load/rep targets carry a rule ID and a human explanation.
- Workout logging functions with airplane mode on, and the session survives an app kill and relaunch.
- Onboarding to first recommended program in under 3 minutes without reading any explanatory text.

## 8. Naming and vocabulary (used consistently in UI and code)

| Term | Meaning | Avoid |
|---|---|---|
| Program | A multi-week training plan made of Program Days | Routine; "split" is a property of a program |
| Program Day | A template for one session (e.g. "Upper A") | Workout template |
| Session | One actual performed workout | Workout log |
| Exercise | A movement in the database | Lift, move |
| Set | One performed set with load, reps, RIR | |
| Target | The engine's suggestion for a set | Prescription |
| RIR | Reps in reserve; RPE shown as 10 − RIR when the user prefers | |
| Recommendation | A stored, explainable proposal with Apply / Keep | The UI may say "suggested" for a load target |
| Coach | The AI assistant | Bot, chatbot |
