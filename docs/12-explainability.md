# 12 · Explainability as a First-Class UX Feature

Principle: **whenever the app makes a meaningful recommendation, the user can easily understand why.** Short by default, deeper on demand, never a wall of text. This document defines what "meaningful", "easily", and "deeper" mean and how the architecture guarantees them.

## 1. What must be explainable

Every one of these carries a full `Explanation` object and a visible **Why?** affordance:

| Event | Example of the short form |
|---|---|
| Load target | "Increase to 80 lb next session." |
| Rep target | "Aim for 11 reps on your first set." |
| Hold or reduce load | "Keep 75 lb today." / "Drop to 70 lb after two tough sessions." |
| Add or remove a set | "One fewer set of curls this week." |
| Exercise swap ranking | "Hack squat is the closest match." |
| Session modification | "Trimmed to 40 minutes." |
| Deload or volume change | "Take a lighter week." |
| Program recommendation or change | "Upper/Lower 4 days suits your schedule." |
| Goal, phase, or nutrition target proposal (Phase 3) | "Consider 150 fewer calories a day." |
| Warm-up sets | "Two warm-up sets before 185 lb." |
| Coach statements about the user's data | Any sentence containing a number about the user |

Things that are *not* recommendations (a PR, a chart, a history row) do not get a Why; they get context where useful.

## 2. The four tiers (progressive disclosure)

```
Tier 0  Inline          "80 lb ↑5"                     always visible, 1 line, with a "Why?" text button
Tier 1  Why? sheet      one or two sentences            opens on tap, ≤ 2 sentences, ≤ ~180 characters
Tier 2  Details         the data + the rule + what would change it   "Show details" inside the sheet
Tier 3  Learn           knowledge items, evidence, sources, rule id   "Learn more" inside details
```

**Tier 0 — Inline.** The recommendation itself, in the user's units, with the change shown as a small delta. "Why?" is a text button, never only an icon, so it is discoverable and screen-reader friendly.

**Tier 1 — Why? sheet.** Opens as a bottom sheet with the title restating the recommendation and one or two plain sentences. Example: "You reached the top of your target rep range while keeping your target RIR." Beneath the sentences, a compact **factor row** shows the two or three numbers that decided it, e.g. `Last: 12 · 12 · 12 @ 2 RIR` and `Target: 8–12 @ 1–2 RIR`. Two buttons: **Got it** (primary) and **Show details** (secondary). Nothing else.

**Tier 2 — Details.** Expands inside the same sheet:
- **What I looked at**: the actual sets used (date, load, reps, RIR), as rows.
- **The rule**: its plain-language name and a one-paragraph description ("Double progression: add reps until you reach the top of the range with reps in reserve, then add weight and start again at the bottom").
- **What would change this**: the counterfactual, always concrete ("If you get 10 reps at 1 RIR next time, I'll keep the weight and aim for 11").
- **Other options considered**, when relevant (for swaps: the next two candidates and why they ranked lower; for holds: "an increase was considered but RIR was 0").
- **Your override history** for this exercise, when it exists ("You've increased faster than suggested 3 times; increments are now larger").

**Tier 3 — Learn.** Knowledge items linked from the rule, each with title, `claim_type`, `evidence_quality`, and sources when present; the rule id and engine version; a link to the settings toggle for advanced mode. Draft or unsourced items are labelled "general guidance".

Advanced mode (settings) changes only defaults: Tier 1 shows RIR and e1RM terms without simplification, and the factor row shows more numbers. It never changes the tier structure.

## 3. Writing rules for explanations

1. Tier 1 is one sentence when possible, two at most. No lists.
2. Lead with the user's action, not the rule ("You reached…", "You've been away…"), then the consequence.
3. Use the user's units and the user's numbers. Never a variable name, never a rule id, above Tier 3.
4. No blame words. "Tough session" not "failed". "Kept" not "couldn't increase".
5. Match certainty to the rule's confidence: high → "I'd increase", medium → "It's probably worth", low → "You could try".
6. Jargon only if advanced mode is on or the user used the term. "Reps in reserve" is spelled out the first time in a session.
7. Every explanation template is written by hand per rule, with variables, and has a snapshot test. No free-form model text at Tiers 0–2.

## 4. Architecture guarantees

**Domain type (in `src/domain`, used by engine, UI, storage, and coach):**

```ts
type Explanation = {
  ruleId: string;              // "progression.double.increase_load"
  engineVersion: string;
  confidence: "high" | "medium" | "low";
  short: string;               // Tier 1, rendered text, ≤ 2 sentences
  factors: Factor[];           // Tier 1 factor row: { label, value, unit? }, max 3
  evidence: EvidenceRef[];     // Tier 2 "what I looked at": set/session/bodyweight references
  rule: { name: string; description: string };            // Tier 2
  counterfactual?: string;     // Tier 2, concrete
  alternatives?: { label: string; reason: string }[];     // Tier 2
  overrideNote?: string;       // Tier 2
  knowledgeItemIds: string[];  // Tier 3
};
```

- The **engine** returns an `Explanation` from every public function. A rule without a template fails the build (a test enumerates rule ids and asserts a template exists).
- **Storage**: `SessionExercise.target_snapshot` and `Recommendation.explanation` store the full object, so history and "Why?" work offline and survive engine upgrades.
- **UI**: exactly one component, `WhySheet`, renders any `Explanation`. Screens never assemble explanation text themselves. `ExplainableValue` is the inline Tier 0 primitive (value, delta, Why button) used for loads, reps, sets, durations, and rankings.
- **Coach**: when asked "why", the coach answers from the stored `Explanation` (passed in the snapshot) rather than re-deriving; its prose may paraphrase Tier 1–2 content but numbers must match. Proposed actions from the coach must include a complete `Explanation` produced by an engine tool, or they are rejected before display.
- **Knowledge**: `knowledgeItemIds` resolve to bundled items on device (07 §4 offline subset), so Tier 3 works without a network.

## 5. Interaction details

- Opening Why never navigates away from the workout; it is a sheet over the current screen and closes with a swipe.
- On the workout screen, the Why button sits beside the suggested value in the input dock; it is 44 pt tall and reachable by thumb.
- On Home, a recommendation card shows Tier 0 and a "Why?" that expands Tier 1 in place; Apply / Keep stay visible while reading.
- The session summary lists next-session changes as Tier 0 lines, each with Why.
- After an **override**, the next explanation acknowledges it once ("You chose 85 lb last time; I've based this on that").
- Why sheets are read aloud correctly: the sheet is announced with the recommendation, then the sentence, then the factor row as "label, value" pairs.

## 6. Measures

- 100% of rules have a Tier 1 template under 180 characters (enforced by test).
- Why sheet opens in under 100 ms from cached data; no network.
- Lifter-group check: at least 8 of 10 testers can restate why a load changed after reading Tier 1 only.

## 7. Changes applied to other documents

- 01 §6 rule 1 now references this document and the four tiers.
- 02: `WhySheet` and `ExplainableValue` added to the component list; recommendation card anatomy references the tiers.
- 04: `Recommendation.explanation` and `SessionExercise.target_snapshot` store the full `Explanation` object.
- 05: `Explanation` type replaced by the version above; the counterfactual and alternatives fields are required outputs for progression, substitution, compression, and deload rules.
- 06: the coach answers "why" from stored explanations and must attach engine-produced explanations to proposed actions.
