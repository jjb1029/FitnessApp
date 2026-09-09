# 14 · Personality Audit and the Forma Personality Layer

Status: proposal for approval before any code changes. Reviewed against the M3 build on 2026-09-08 as a consumer product, with Hevy, Strong, and Fitbod as the comparison set.

## 0. The honest verdict

A Hevy user opening Forma today would think: "clean, like Hevy in dark mode, with a Why button." They would not yet think "this feels different." The reasons are specific and fixable:

1. **The intelligence is invisible at the moment of use.** The engine decides loads, reps, rest, records, and next steps, but the screen presents those decisions in the same visual register as static data. "Suggested 80 lb ↑" in 13 pt grey caption looks like metadata, not a decision Forma made for you.
2. **Nothing acknowledges the user.** Complete a set and a row changes state. Hit every rep and nothing is said. Beat last time and nothing is said. The one acknowledgement that exists (the PR toast) uses the system toast style, the same style as "Couldn't save that set."
3. **States do not feel like states.** Resting looks like lifting with a countdown pasted into one row. Finishing is a receipt. Starting is a list.
4. **The voice is inconsistent.** Some copy is Forma speaking ("I will adjust it from your first session"), some is a system ("Suggested 80 lb"), some is a form ("SESSION NOTE", "NEXT TIME"). The Why sheet's Tier 2 headers read like a manual: "THE RULE", "WHAT I LOOKED AT".
5. **The visual identity is default-modern.** Near-black background, hairline-bordered cards, radius 16, system font at standard weights, and the single most common accent colour in fitness software: app blue. Every choice is defensible and none is ours.

None of this argues for gradients, badges, or noise. It argues for making the decisions Forma already makes legible, giving the workout a rhythm with visible phases, and speaking with one voice at a few earned moments.

---

## 1. Audit by component

| # | Component | What it does now | Where it feels bland | Opportunity |
|---|---|---|---|---|
| 1 | Workout header | Chevron, day name, elapsed time, ⋯, thin progress bar, "3 / 18 sets" | Neutral title bar. Elapsed time is the loudest number and it means nothing to the lifter. No sense of phase. | Show the phase (Lifting · Resting · Last exercise) instead of the raw clock as the subtitle; keep elapsed available but quiet. Progress copy as "3 of 18" not a fraction. |
| 2 | Exercise blocks | Expanded: name, "3 × 8–12 · 2 RIR · rest 1:45", "First time"/"Last time 75 × 9 · 9", rows, four blue text actions. Collapsed: name, "3 × 8–12", "0 / 3". | The spec line is engineer notation. "First time" is a flat label where a partner would give a cue. Four equally weighted actions (Add set · Swap · Note · Skip) is the noisiest element on screen. Collapsed fractions read as a spreadsheet. | Spec line in words: "3 sets of 8–12, 2 in reserve". First-time line becomes guidance. Actions collapse to **Add set** and **⋯**. Collapsed rows show "Next" for the one after current and "Done" for finished, not "0 / 3". |
| 3 | Set rows | "75 lb × 9 · 2 RIR" in mono; ✓ for done, ▶ for current, dim for pending; tiny trophy on PR. | Clinical but correct. Done rows and pending rows differ only by a glyph and colour. No transition when a row lands. The trophy is 14 px. | A 150 ms land animation for the completed row; a target-hit tick in success colour; PR rows carry a small "Best" pill rather than a 14 px glyph. |
| 4 | Input dock | Context line ("Set 1 of 3 · Suggested 80 lb ↑ · Why?"), three fields, Complete set. | Structurally strong and fast: keep it. The context line reads like telemetry; "Starting load" is a category name, not a sentence. The disabled Complete state with "—" gives no cue what to do. Nothing in the dock tells you what happens after you tap. | Context line becomes Forma's line: "80 lb today. Why?" / "Pick a weight you can do 8 with room to spare." Disabled state says "Enter a weight to log". |
| 5 | Rest timer | One row swaps into the dock: "Rest 1:43 ▰▰▱ −15 +15 Skip". Ends with green "Rest done" for 3 s and one light haptic. | It is a countdown, not recovery. The rest of the screen is unchanged. The end is easy to miss. The last seconds give no warning. | A recovery mode: the dock surface shifts tone, the countdown becomes the largest number on screen, the fields dim, a "Next: 80 lb × 8" preview appears, the last 3 s pulse with a haptic each, and the return is "Rest's up." with a medium haptic and a one-time highlight on Complete set. |
| 6 | Complete-set interaction | Tap → light haptic → row flips → next set prefilled → rest starts. | Instant, which is right. Also flat: every set gets the same tick whether you hit target, beat last time, or missed. No words. | Grade the moment: hit target = "Good set." with a medium haptic; above target or better than last time = "That's better than last time." with success haptic; below = "Logged. I'll account for that." with a light tick. One line, in the dock, for the first two seconds of rest. |
| 7 | PR feedback | Toast "New best on Incline Dumbbell Press", success haptic, trophy glyph, summary card "🏆 NEW BEST". | The toast is the same component as error messages. Emoji in a label is off-voice. The summary card says what, not that you got stronger. | Inline moment: the dock line "New best. 97 lb estimated max, up 4." in accent for 3 s, a "Best" pill on the row, and the summary opening with "You got stronger today." plus the number. No confetti. |
| 8 | Why sheet | Title restates the value; Tier 1 sentence; factor box; Got it / Show details; Tier 2 headers WHAT I LOOKED AT / THE RULE / WHAT WOULD CHANGE THIS; Tier 3 with rule id. | Tier 1 is right. Tier 2 reads as documentation: "The rule: Double progression: add weight" followed by a textbook paragraph. The counterfactual, the most useful line in the product, is buried third. Voice flips between "I" and passive. | Title is the decision ("80 lb today"). Tier 1 unchanged. Counterfactual promoted to Tier 1 as "What changes my mind". Tier 2 headers in voice: "What I saw", "How I decide". Rule descriptions rewritten in first person. Tier 3 "Where this comes from". |
| 9 | Completion summary | DONE / name / "1 min · 2 sets · 1,350 lb lifted" / PR card / NEXT TIME rows / Session note / Done. | A receipt. No sentence about the session. "1,350 lb lifted" is trivia. Next-time rows say "keep" or "↑ 5" like a diff. The closing button says "Done" to a screen that already says DONE. | A debrief: one verdict sentence from the data ("Every target hit. Incline press goes up next time."), PR first if any, next-time rows as decisions ("Incline press · 80 lb next time"), closing button "Done for today." |
| 10 | Home / Today card | Accent-tinted card, TODAY, day name, "7 exercises · about 48 min", muscle pills, exercise preview, Start, Do later / Skip. Greeting + "Build muscle · Week 1". | The best screen. Still states the schedule, not the intent: it knows *which* workout, not *what today is about*. Greeting line is generic. | One contextual sentence from today's targets: "Chest and lats. Incline press goes up to 80 lb." / "Same weights as last time; add a rep where you can." / welcome-back line. Greeting subline becomes "Upper A is ready." |
| 11 | Typography, colour, spacing, cards, borders | System font, standard weights; accent #2F6BFF / #5B8CFF; near-black bg; hairline-bordered cards everywhere; radius 16. | Everything is default-modern. App blue is the most common accent in the category. Hairline borders on every card make the workout screen boxy. Numbers, the app's main content, use the same weight as prose. | Keep spacing, radius, and type scale. Two token changes: a distinctive accent hue, and workout-screen surfaces that use tone instead of borders. Numbers get a heavier tabular weight in the dock and set rows. |
| 12 | Motion / haptics | Sheets spring; toasts fade; list scrolls to the current exercise. Haptics fire in three places only: set complete (light), PR (success), rest end (light). The Stepper never fires the detents the design system promised. | Transitions are absent at the moments that matter: set lands, exercise advances, rest starts, rest ends, finish. Haptics are undifferentiated. | A small vocabulary: light = detent and log; medium = target hit and rest start; success = PR and finish; warning never. Motion only at phase changes, all under 250 ms, all off under reduced motion. |
| 13 | Microcopy | ~60 strings: "Complete set", "Set 1 of 3 · Starting load", "Rest done", "First time", "Finish early? 15 planned sets are not done.", "DONE", "NEXT TIME", "keep", "Got it", "Log your weight to see a trend". Engine explanations use "I" in places. | Three registers mixed: system labels, form fields, and a partner. Nothing is wrong; nothing is Forma. | One voice, one owner (`src/engine/voice`), every line earned by a state. |

---

## 2. The Forma voice

**Who is speaking.** Forma is the partner who wrote today's plan and is spotting you. It has your history in hand. It is confident because the engine is deterministic, encouraging because it noticed, and quiet because you are lifting.

### Principles
1. **Earned, not sprinkled.** A line appears only when a state fired it. "Better than last time" requires history that says so. Praise without data is noise, so it does not exist.
2. **Acknowledge, then direct.** Two beats at most: "Good set. Rest." The second beat is the next action.
3. **Short declaratives. Periods.** No exclamation marks, no emoji in text, no "amazing", "crushed", "beast".
4. **"I" for Forma's decisions, "you" for your effort, "we" for the plan, rarely.** "I've eased today's loads." "You hit every rep." "Right where we wanted you."
5. **Specific over generic.** "Incline press goes up to 80 lb" beats "Great progress!" every time.
6. **Never scold, never nag.** A miss is "a tough set" and Forma "accounts for it." Skips and layoffs are met with adjustment, not commentary.
7. **Quiet by default.** The workout screen shows a Forma line at five moments only: the target, the set acknowledgement, rest start and end, and a record. Everything else is data and controls.

### Copy system by moment
Lines are chosen by state, not at random. Where two or three variants exist they rotate by set index so a session does not repeat itself; rotation is deterministic so a re-render never changes a line.

| Moment | State | Line |
|---|---|---|
| Target (dock context) | first time | "Pick a weight you can do 8 with room to spare." |
| | suggestion, increase | "80 lb today. Up from 75." |
| | suggestion, hold | "75 lb today. Same as last time." |
| | suggestion, eased (layoff/reduce) | "70 lb today. Eased after time off." |
| | disabled (no weight) | "Enter a weight to log." |
| Set complete | reps in range, target reached | "Good set." / "Right where we wanted you." / "Nice. One more." (when one set remains) |
| | above range or better than last time | "That's better than last time." / "Above target. I'll account for that next time." |
| | below range | "Tough set. Logged. I'll account for that." |
| | edit saved | "Updated." |
| Rest start | default | acknowledgement line for 2 s, then "Rest 1:45" |
| Rest, last 3 s | | countdown only, pulsing |
| Rest end | | "Rest's up." |
| Exercise done | more remain | "Incline press done. Lat pulldown is next." |
| | last exercise done | "That's the last one." (button: "Finish workout") |
| Record | e1RM or load PR | "New best. 97 lb estimated max, up 4." |
| Finish | all targets hit | "Every target hit. Two lifts go up next time." |
| | mixed | "Solid session. I've set next time's targets." |
| | early finish | "Good stopping point. Nothing is lost." |
| Welcome back | ≥ 5 days | "Welcome back. I've eased today's loads by 10%." |
| Today card sentence | increases planned | "Chest and lats. Incline press goes up to 80 lb." |
| | holds only | "Same weights as last time. Add a rep where you can." |
| | first session | "Your first session. Find your weights; I'll take it from there." |
| Why, title | | the decision: "80 lb today" / "Hold at 75 lb" / "Lat pulldown instead" |
| Why, Tier 2 headers | | "What I saw" · "How I decide" · "What changes my mind" · "Where this comes from" |

Rule descriptions in `rules.ts` are rewritten in the same voice: "I add weight when every set reaches the top of your range with reps to spare, then start you back at the bottom."

---

## 3. Workout rhythm: prepare → lift → complete → recover → repeat → finish

| Phase | What the user sees | Motion | Haptic |
|---|---|---|---|
| **Prepare** | Current exercise expanded; dock context line is Forma's target sentence with Why; header subtitle "Lifting". | Block expands with a 200 ms fade; list settles with the block at top. | none |
| **Lift** | Dock at full emphasis. | none | Stepper detents (light) |
| **Complete** | Row lands with a check; dock line shows the acknowledgement for 2 s. | Row fades in 150 ms with a brief success tint. Button presses to 0.97 scale. | light (logged), medium (target hit), success (PR) |
| **Recover** | Dock shifts to recovery: surface tone changes, the countdown becomes the largest number, fields dim to 60%, a "Next: 80 lb × 8" line appears, header subtitle "Resting". Last 3 s pulse. | 200 ms cross-fade into recovery mode. | medium at start; light at 3, 2, 1 |
| **Return** | "Rest's up." for 2 s; fields return to full; Complete set gets a one-time highlight. | 200 ms cross-fade out. | medium |
| **Repeat / advance** | Finished block collapses to "Done"; next expands; a one-line "Lat pulldown is next." in the dock. | Collapse 200 ms, expand 200 ms, scroll. | none |
| **Finish** | On the last set: dock line "That's the last one." and Complete becomes Finish. Summary opens as a debrief. | Summary fades in; PR pill scales in once. | success |

Under reduced motion every transition is an instant swap; haptics are unchanged.

---

## 4. The ten changes that matter most

Ranked by how much they move the "oh, this feels different" needle per unit of work.

1. **Voice module + state-driven acknowledgement** (`src/engine/voice.ts`, consumed by the dock). The single biggest change: the app starts noticing. *M3 polish.*
2. **Recovery mode in the dock** with the big countdown, dimmed fields, next-set preview, last-3-second pulse, and "Rest's up." *M3 polish.*
3. **Graded set completion**: motion on the landing row, haptic by outcome, acknowledgement line. *M3 polish.*
4. **Forma's target sentence in the dock** replacing "Set 1 of 3 · Suggested 80 lb ↑", plus "Enter a weight to log" for the disabled state. *M3 polish.*
5. **Why sheet in voice**: decision title, counterfactual promoted, headers and rule descriptions rewritten. *M3 polish.* (All rule text lives in one file; this is copy, not architecture.)
6. **Summary as a debrief**: verdict sentence, PR first, next-time rows as decisions, "Done for today." *M3 polish.*
7. **Inline PR moment** replacing the toast; "Best" pill on the row; no emoji. *M3 polish.*
8. **Exercise block hierarchy**: spec line in words, first-time guidance, actions collapsed to Add set + ⋯, collapsed rows say Next / Done. *M3 polish.*
9. **Today card sentence** from today's targets, and the greeting subline "Upper A is ready." *M3 polish, simple version; richer versions (weekly context, trend) in M4 when history exists.*
10. **Accent hue and workout surfaces** (see §6), stepper detents, finish haptic, phase subtitle in the header. *M3 polish if the token change is approved; otherwise the haptics and subtitle alone.*

Later, not now: "better than last time" comparisons across weeks with charts (M4), the weekly review screen (M7), rest-end sound (M6, needs an audio module), welcome-back and stagnation lines that need multi-week data (M5/M8), coach conversation (M9).

Explicitly rejected: streaks, badges, confetti, XP, social, a talking assistant on every screen, decorative gradients, animated backgrounds.

---

## 5. Tokens: change them or layer on top?

**Recommendation: layer first, with two deliberate token changes.**

Personality comes from hierarchy, motion, feedback, and copy. The spacing scale, radii, type scale, and neutral palette are sound and should stay. Two token-level changes are worth making because they are cheap and the current values actively say "generic":

1. **Accent hue.** Move from app blue to a hue no major tracker owns and that reads calm and confident. Proposal: a mineral teal, light `#0F9D8A`, dark `#2CC4AE`, with subtle tints `#E3F5F1` / `#12302C`. It sits between the success green and the neutrals without competing with green for "progress" meaning. Contrast on both backgrounds passes 4.5:1 for text. (Alternative if teal reads too corporate: a warm ember `#E8642B` / `#FF7A45`, more energetic, less calm. I would pick teal for the stated feeling.)
2. **Workout-screen surfaces.** Drop hairline borders on the workout list and dock; distinguish current, done, and pending by surface tone and type colour only. Cards elsewhere keep their borders.

Additionally, numbers in the dock and set rows move to a heavier weight (600) with tabular figures, so the content the lifter cares about carries the most weight on screen. No new fonts.

---

## 6. What "different" will feel like after this

First session, first set: the dock says "Pick a weight you can do 8 with room to spare." You log it and the app says "Good set." and shifts into rest with the next set already waiting. Rest ends with "Rest's up." and a nudge in your hand. You finish and the screen says "Every target hit. Incline press goes up next time." with a Why beside the number. Tomorrow the Today card says "Chest and lats. Incline press goes up to 80 lb." That is the loop Hevy does not have and Fitbod does not explain. It is achievable with copy, state, and about six components, on the existing foundation.
