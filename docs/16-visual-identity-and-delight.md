# 16 · Visual Identity and Delight

Status: **approved 2026-09-10. Tier 1 implemented; Tiers 2–4 not started.**

Approval amendments:
- **The ink primary button is an experiment, not a law.** It ships behind `primaryActionFill` in `src/ui/tokens.ts`; flipping that one value restores the teal button everywhere. Judge it on device before it is locked in.
- **"Space over borders" is not "cards are forbidden."** A container has to communicate meaning: keep it where it stands for a genuinely discrete object or collection, remove it where it only wraps content that space and hierarchy could group. Under that rule the Today block, the summary's next-time list and the finish verdict lost their cards; Home's bodyweight/week list, the deferred strip and the settings groups kept theirs.
- **Teal marks what Forma computed; green marks what the user did.** An estimated 1RM is Forma's inference, so a record's estimated max is teal; a logged +5 lb or +1 rep is the user's own fact, so it is green. This resolves the tension between §5's colour law and §9's M4.

This document sits beside docs/14 (how Forma speaks) and docs/15 (what Forma is and how screens are arranged). It answers a third question: **what Forma looks like.**

Audited against the working tree at commit `b099173`, by reading the components rather than the specs. Where the documents and the code disagree, the code is quoted.

The two questions this has to answer:

> Why would someone enjoy looking at Forma?
> If I removed the logo, would the interface still feel recognisably like Forma?

Today the honest answer to the second is **no**. §1 says why in specifics, §2–§9 propose the system that would change it, and §11 says how this pass could make things worse.

---

## 1. Current-state visual diagnosis

### 1a. What genuinely works and must not be lost

**The dock is the strongest structural asset in the app.** `InputDock` owns the exercise name, the door, one line of Forma, two 72 pt-tall action fields at `monoAction` (32/700), and one full-width button. It is a single unit under the thumb and it reads as one. Nothing in Hevy, Strong or Fitbod is arranged this way. Everything below builds on it rather than replacing it.

**The numeric inversion happened, in the dock.** `ExerciseBlock`'s expanded title is `headline` (17), the dock's steppers are `monoAction` (32/700, −0.3 tracking), the countdown is `monoDisplay` (44/600, −0.5). docs/15 §8 item 2 is real in the code, not just in the doc.

**Rest is the only place the app changes shape, and it works.** `resting` swaps the dock's ground to `bgElevated`, promotes the countdown to 44 pt, mutes both steppers to `opacity: 0.6` without resizing them, adds a 3 px progress bar and a `Next: …` preview. This is signature S2 from docs/15, and it is the single most distinctive thing in the build.

**The Why sheet's order is a person's order.** Decision → *What I saw* → *What changes my mind* → *What you taught me*, with the rule behind one more tap. That is right and stays.

**Accessibility discipline is real and is not decoration to be traded away.** `accessibilityLiveRegion="polite"` on the moment line and the recovery block, `accessibilityRole="adjustable"` with increment/decrement actions on `Stepper`, `maxFontSizeMultiplier={1.3}` on every `Text`, `StatusPill` never using colour alone, and `reduceMotion` honoured in all three existing animations. Every proposal below has to survive these.

### 1b. What still makes Forma look generic

Ten findings, each traceable to a line of code.

**F1 · The whole app is one visual idea: a rounded rectangle with a hairline border.**
`Card`, `Stepper`, the RIR field in `InputDock`, `Chip`, `TextField`, `OptionRow` and the sheets all resolve to the same recipe: `bgElevated` or `bgSunken`, `borderWidth: StyleSheet.hairlineWidth`, `radius.md` or `radius.lg`. The workout screen is four stacked boxes: an elevated rounded block for the exercise, three sunken rounded fields, a shadowed slab for the dock. docs/14 §5 explicitly recommended dropping hairline borders on the workout surfaces; that part was never implemented — `Stepper` and the RIR pressable both still carry `borderWidth: StyleSheet.hairlineWidth`.

**F2 · The Decision Block is a doctrine, not a component.**
There is no `DecisionBlock` in `src/ui/components`. The decision → basis → door shape is hand-built four times with four different type ramps:

| Site | Lead | Basis | Door |
|---|---|---|---|
| `TodayCard` | `display` 34 | `body` 17 secondary | `caption` 13 accent, top-right |
| `InputDock` | `headline` 17 + `monoAction` 32 in the fields | `callout` 15 / `caption` 13 | `callout` 15 accent, top-right |
| `SummaryView` | `display` 34 | `body` 17 rows | `callout` 15 accent, per row |
| `ExplainableValue` | `mono` 17 | `callout` 15 delta | `callout` 15 accent, trailing |

Four blocks that share an argument structure and share nothing visually. The user cannot learn the pattern because there is no pattern to see. This is the largest single gap between docs/15 and the build.

**F3 · Teal means "you can tap this", not "Forma decided this".**
Current accent surface area: primary `Button` fill, tab bar active tint, every `Why?` link, the current set row's `accentSubtle` tint, `ProgressBar` default, `Toggle`, selected `Chip`, selected `OptionRow`, `ActiveSessionPill`, `StatusPill tone="accent"`, `Card tone="accent"`, the last three seconds of the countdown, the warm-up hint, the arrival moment. Forma's voice and the app's controls are painted the same colour, so §3 of the brief — a clear distinction between *Forma is telling you something* and *you are entering something* — does not exist in the build.

**F4 · Numbers stop being special below 32 pt.**
`typography.mono` is 17/600 — the same size as `body`, one weight up. Every number outside the dock uses it: set rows, Why-sheet factor values, `ExplainableValue`, next-time targets. On the two screens that are *entirely* numbers — the summary and the Why sheet — the numbers are the same size as the prose around them. There is no `mono` step at 13 or 22, so the ramp jumps 17 → 28 → 32 → 44 with nothing usable in between.

**F5 · There is no motion at any phase boundary.**
Reanimated appears in five files. Two are workout-specific: `Landing` (a success tint on a set row) and `ReturnHighlight` (a wash behind Complete set). `theme.motion` is referenced only in `Sheet` and `Toast`. The lifting → resting swap is an unanimated conditional render. Advancing to the next exercise is a `scrollToIndex` with no transition. The app has three animations and none of them is at a state change.

**F6 · The dock changes height between phases, so the list jumps.**
Lifting renders identity row + line + fields + button. Resting renders top row + countdown row + bar + preview + fields + button. `onLayout` reports the new height, `dockHeight` state updates, and the `FlatList`'s `paddingBottom` changes underneath the user. The most important transition in the product currently ends with the content behind it shifting.

**F7 · Forma's signature behaviour is rendered as one truncated line.**
The arrival moment — docs/15 calls the override-calibration line "the most Forma-like behaviour in the product" — renders as `<Text variant="callout" color="accent" numberOfLines={1}>`. The line is *"You've gone heavier than I suggested three times. I've made the jumps bigger."* At 15 pt on a Pixel 9 that ellipsises. The app's proudest moment is a clipped caption.

**F8 · A personal record is rendered by the same component as "Skipped · no time".**
`SetRow` shows `<StatusPill label="Best" tone="accent" icon="trending-up" />` — 26 pt tall, 13 pt label. `ExerciseBlock` uses the identical component for "Swapped in" and "Skipped · not feeling it". The most meaningful measured event in the product and a housekeeping note have the same visual weight.

**F9 · Home has two competing heads, and below the card it is a settings screen.**
`HomeScreen` opens with `title2` (22) "Good evening" over a `caption` goal line, then a `display` (34) "Upper A is ready." inside the card. Two headlines, and the smaller one is on top. Below the card sit two `ListRow`s inside a bordered `Card`: Bodyweight with a filled `+` button, This week with dots. That is a small dashboard, which is exactly what B2 in docs/15 refuses.

**F10 · The workout header is the most generic element left in the app.**
A 56 pt bar with `chevron-down` / centred `headline` title / `ellipsis-horizontal`, then a full-width `ProgressBar` and "3 of 18 sets" in `caption`. That is the header of every tracker on the store. It also spends the top of the screen — the most valuable strip — on the session's name, which docs/15 S3 explicitly demotes to context.

### 1c. The verdict on the logo test

Cover the wordmark and screenshot the workout screen today: a dark list, a rounded block, three sunken fields, a teal button. It is a good tracker. The only frame that would survive the test is the rest state, because it is the only frame where the app changed shape.

---

## 2. Forma's visual identity: five signatures

Not decoration. Each one is a rule about how information is set, and each one appears in at least four places.

### V1 · The Decision Block (structural)

A real component with a fixed grammar, so the shape becomes learnable.

```
EYEBROW    what kind of thing this is        label 13/600, +0.4 tracking, uppercase
LEAD       the decision or the action        the largest thing in the block
BASIS      what it is based on               callout 15, secondary, ≤ 2 lines
DOOR       Why? / change it                  accent, fixed position, always present
```

Three ranks, one per role, and the rank chooses the lead's size:

| Rank | Where | Lead type |
|---|---|---|
| `screen` | Today card, summary verdict | `display` 34, or `numDisplay` when the lead is a number |
| `section` | The dock's current action, rest | `numAction` 32 |
| `row` | Next-time rows, Why factors, set rows | `numBody` 17 |

The eyebrow and the door share the top row for `screen` and `section`; the door trails the value for `row`. Once a user has read three of these, every future Forma surface is readable without instruction — including everything M5 and M9 will add.

**Appears in:** Today card, the dock, the rest state, every next-time row, the Why sheet's header, the summary verdict, and every future coach proposal.

### V2 · Numbers are a different material from words

A strength app should treat a load the way a scale treats a load. Today only the two dock sizes do.

The rule: **any value the engine measured or decided is set in the numeric ramp, never in prose type**, and **its unit is always one step smaller and tertiary**. `80 lb` is not a string in `body`; it is `80` at the numeric size beside `lb` at caption weight in `textTertiary`. This already half-exists inside `Stepper` (value over unit) — V2 generalises it into a `Measure` primitive used everywhere a number appears.

That single treatment is more identifiable than any accent colour, and it is free: no new font, no new weight, no new colour.

**Appears in:** set rows, the dock, the countdown, Why-sheet factors, summary highlights and stats, next-time rows, the Today sentence's loads, bodyweight, week counts.

### V3 · Teal is Forma's voice; ink is the user's action

One colour law, stated as a sentence a reviewer can apply:

> **Teal never means "tappable". Teal means Forma is speaking, deciding, or offering its reasoning.**

The primary button stops being teal and becomes **ink**: a solid fill in `text` colour with `bg`-coloured type — near-black on white, near-white on black. It is full-width, 56 pt tall, and the only button in its block, so its salience comes from contrast and size rather than hue. That is the single most debatable proposal in this document and §11 carries its risk and its fallback.

What this buys: when teal appears on screen it *means* something, every time, and the app stops being "the teal fitness app" by using teal about six times per screen less.

**Appears as:** the eyebrow when Forma changed something, the door, the arrival wash, the countdown, "I've set next session", the delta on a target Forma raised.

### V4 · The ground changes with the phase

The screen's background — not a badge, not a chip — tells you what phase you are in. Lifting is `bg`. Resting is a distinct quiet ground across the *whole* screen, not just the dock. Reviewing is `bg` with much more air. You can tell the phase from across the room with the phone on a bench, which is exactly the use case.

This is docs/15 S2 taken from the dock to the screen. It is one animated colour and no layout movement.

**Appears in:** the workout screen's three phases, and later any timed state (M8's compressed session, M6's warm-up ramps).

### V5 · Space separates, borders are a last resort

Forma's important surfaces have no outline. They are separated by ground and space, aligned to one left edge, with a rhythm of sizes doing the grouping. Cards survive in lists and settings, where they are actually a list of discrete things.

Concretely: hairlines come off `Stepper`, the RIR field, the summary's next-time `Card`, and the expanded `ExerciseBlock`. The Today block stops being a tinted card and becomes ground plus type.

**Appears in:** the workout screen, the dock, the summary, Home's top third.

### What is deliberately *not* a signature

The teal hue itself, the radii, the system font, the spring curves. Per docs/15: change all four and keep V1–V5 and it is still Forma; keep all four and lose V1–V5 and it is not.

---

## 3. Design principles

Nine rules. Short enough to apply in review.

1. **One block owns the screen.** Its lead is the largest thing on it. Nothing else exceeds `headline`.
2. **Emphasis follows the phase, not the component.** The same component renders at different weight while lifting, resting, and reviewing.
3. **Numbers are never set in prose type.** Values use the numeric ramp; units are one step down and tertiary.
4. **Teal is Forma. Ink is the user's action. Green is a measured improvement. Neutral is data.** No fifth meaning.
5. **Ground and space group things. A border is an admission that the layout failed.**
6. **Every block that recommends carries a door,** at the same place, at the same size, always one tap.
7. **Motion only at phase boundaries,** ≤250 ms, only on opacity, ground colour, and ≤6 px of position. Everything else is still — especially while a set is in progress.
8. **Nothing celebrates what the engine did not measure.** If there is no number behind it, there is no moment.
9. **Colour never carries meaning alone; reduced motion swaps instantly; every target stays ≥44 pt; every size survives `maxFontSizeMultiplier` 1.3.**

---

## 4. Typography system

### 4a. Keep

The scale, the system font, the 4 pt spacing grid. `display` 34 / `title1` 28 / `title2` 22 / `headline` 17 / `body` 17 / `callout` 15 / `caption` 13 / `label` 13+0.4 is a sound ramp and changing it would be churn.

### 4b. Add optical tracking

Currently only `label` (+0.4), `monoAction` (−0.3) and `monoDisplay` (−0.5) set tracking; everything else is 0. Tight large text against wide small caps is one of the cheapest premium signals there is.

| Token | Now | Proposed |
|---|---|---|
| `display` | 34/600, 0 | 34/600, **−0.4** |
| `title1` | 28/600, 0 | 28/600, **−0.3** |
| `title2` | 22/600, 0 | 22/600, **−0.2** |
| `label` | 13/600, +0.4 | unchanged |
| everything else | 0 | unchanged |

### 4c. The numeric ramp

Replace the four `mono*` tokens with a five-step ramp that has usable steps at both ends. Names change from `mono` (which describes a font that is not being used) to `num` (which describes the job).

| Token | Size / weight | Tracking | Used for |
|---|---|---|---|
| `numCaption` | 13 / 600 | 0 | deltas, set indexes, stat captions, week counts |
| `numBody` | 17 / 600 | −0.2 | set row values, Why factors, next-time targets, bodyweight |
| `numTitle` | **22 / 700** *(new)* | −0.3 | summary highlight values, a PR's estimated max, the Today card's load |
| `numAction` | 32 / 700 | −0.3 | the dock's steppers — the thing about to be acted on |
| `numDisplay` | 44 / 600 | −0.5 | the rest countdown |

All carry `fontVariant: ['tabular-nums']`. `monoLarge` (28) has no remaining call site once `numTitle` exists and should go.

### 4d. The `Measure` primitive

```tsx
<Measure value="80" unit="lb" size="numTitle" tone="text" />
<Measure value="1:32" size="numDisplay" tone="accent" />
<Measure value="+5" unit="lb" size="numCaption" tone="success" />
```

Rules: the unit renders at `caption` in `textTertiary`, inline-trailing at `numCaption`/`numBody` and stacked-below at `numAction`/`numDisplay` (matching what `Stepper` already does). The whole thing is one accessibility node reading "80 pounds". Every number in the app goes through it, which is what makes V2 visible rather than theoretical.

### 4e. Hierarchy by phase

Exactly one element per phase gets the top of the ramp. This is docs/15 §3's table, made typographic.

| Phase | The one dominant element | Token | Everything else caps at |
|---|---|---|---|
| Planning (Home) | "Upper A is ready." | `display` 34 | `body` 17 |
| Lifting | the two steppers | `numAction` 32 | `headline` 17 |
| Resting | the countdown | `numDisplay` 44 | `callout` 15 |
| Forma is deciding (arrival) | the moment line | `title2` 22, teal, up to 3 lines | `caption` 13 |
| Reviewing (summary) | the verdict | `display` 34 | `numTitle` 22 for evidence |

Note the fourth row: when Forma is asking for or announcing a decision, **the sentence is briefly allowed to be the largest thing on screen**. This is the only exception to "Forma's voice never outranks the user's data" (docs/15 §3), and it is bounded — it happens at a transition, it lasts 5 s, and it never happens mid-set. It is also the fix for F7.

---

## 5. Colour philosophy

### 5a. The law

| Colour | Means | Concretely |
|---|---|---|
| **Teal** | Forma is speaking, deciding, or reasoning | eyebrow when something changed, every door, the arrival wash, the countdown, the next-session promise, a delta Forma chose |
| **Ink** (`text` on `bg`) | the user's action | Complete set, Start workout, Finish workout, Done for today |
| **Green** (`success`) | something the user did, measured as better | a landed set at or above target, summary highlight values, week dots |
| **Neutral** | data at rest | every logged set, every stat, the progress bar, the list |
| **Warning / danger** | genuinely exceptional | discard, destructive confirms. **Never a missed target** (docs/15 B6) |

### 5b. What loses its teal

`ProgressBar` default → neutral (`text` at 40% or `success`); session progress is the user's, not Forma's. Tab bar active tint → `text`. `Toggle`, selected `Chip`, selected `OptionRow` → ink. Primary `Button` → ink. The current set row's `accentSubtle` tint → `bgSunken`. `ActiveSessionPill` → keeps teal, because it is Forma holding your place.

That removes roughly two thirds of the teal on a given screen, which is what makes the remaining third legible.

### 5c. What gains teal

`accentSubtle` becomes reserved: a teal wash on screen means **Forma just did something**. It appears behind the arrival moment and nowhere else in steady state. Today it is used for the current set row, the Today card's whole background, the return highlight, and `StatusPill`; after this it is used once, meaningfully.

### 5d. One optional token pair

A `restGround` for V4: light `#F2F7F6`, dark `#0C1513`. Both are under 3% chroma — a ground you would call grey until you see it beside `bg`. Everything in §7 works without it using `bgSunken`; the tinted version is what makes the rest state unmistakable at a glance. Tier 4, and the first thing to cut if the app starts reading as "the teal fitness app."

---

## 6. The Decision Block as a visual language

```tsx
<DecisionBlock
  rank="screen" | "section" | "row"
  eyebrow={{ text: 'TODAY', tone: 'secondary' | 'accent' }}
  lead={<Measure … /> | string}
  basis="Chest, lats, and side delts. Same weights as last time."
  door={{ label: 'Why?', onPress }}
  action={<Button … />}
/>
```

**Invariants**, which are what make it recognisable:

- Eyebrow and door occupy one row above the lead, baseline-aligned, for `screen` and `section`. The door trails the value for `row`.
- The basis sits directly under the lead with 4 pt of space, `callout`, `textSecondary`, at most two lines, and it always contains a number the user produced.
- The eyebrow turns teal **only** when Forma changed something since last time. A teal eyebrow is the app's tell.
- No border, no card. Blocks are separated by `spacing.xxl`.
- The lead's size comes from the rank, never from the component's own opinion.

### Five renderings

**Today (rank `screen`)** — replaces the tinted `Card` in `TodayCard`

```
TODAY                                              Why?      ← label 13/600 +0.4 secondary · callout accent
Upper A is ready.                                            ← display 34/600 −0.4
Chest, lats, and side delts. Incline press goes to  80 lb    ← callout 15 secondary; the load via Measure numTitle
7 exercises · about 48 min                                   ← caption 13 tertiary

┌───────────────────────────────────────────────┐
│               Start workout                   │            ← ink fill, 56 pt, full width
└───────────────────────────────────────────────┘
Do later            Skip this day                            ← ghost, caption weight
```

**The current action (rank `section`)** — `InputDock`, lifting

```
Incline dumbbell press                             Why?      ← headline 17 · callout accent
Set 2 of 3 · 8–12 reps · 2 RIR                               ← caption 13 secondary

  −      80      +        −     10     +        2            ← numAction 32/700, borderless on bgSunken
         lb                     reps            RIR          ← caption tertiary

┌───────────────────────────────────────────────┐
│               Complete set                    │            ← ink fill
└───────────────────────────────────────────────┘
```

**Rest (rank `section`)** — same component, phase-swapped, on `restGround`

```
RESTING                                            Skip      ← label accent · callout secondary

      1:32                                    −15    +15     ← numDisplay 44, teal
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░               ← 3 px, teal

Next  ·  80 lb × 10                                          ← callout secondary + Measure numBody
```

**Next time (rank `row`)** — replaces `ExplainableValue` in the summary

```
Incline press          85 lb    ↑ 5      Why?                ← body · Measure numBody · numCaption success · callout accent
```

**Forma changed its mind (the arrival moment)** — the fix for F7

```
FORMA                                                        ← label 13/600, teal
You've gone heavier than I suggested
three times. I've made the jumps bigger.                     ← title2 22, teal, up to 3 lines, NOT truncated
                                                   Why?
```

The review question stands as docs/15 wrote it: *is this a Decision Block, or did we build a form?* With the component in the codebase it stops being a judgement call — either the screen uses it or it does not.

---

## 7. State-based visual rhythm

The breathing. Four measurable dimensions per phase: ground, dominant element, spacing scale, and how much teal is on screen.

| Phase | Ground | Dominant | Spacing | Teal | Feels |
|---|---|---|---|---|---|
| **Planning** (Home) | `bg` | "Upper A is ready." `display` | generous — `xxl` between blocks, `huge` above the fold | eyebrow + door only | calm, spacious, decided |
| **Lifting** | `bg` | the two steppers `numAction` | tight — `sm`/`md`, blocks close together | door only | focused, dense, numeric |
| **Resting** | `restGround` (or `bgSunken`) | the countdown `numDisplay` | one element with air around it — `xl` | countdown + bar | minimal, quiet, anticipatory |
| **Forma decides** (arrival) | `bg` + a teal wash behind the block, 5 s | the moment line `title2` teal | `lg` | eyebrow, line, wash | brief, deliberate, unmistakable |
| **A record** | `bg` | the set row's value promoted to `numTitle` teal, 1.2 s | unchanged | the value and a hairline | earned, over quickly |
| **Reviewing** (summary) | `bg` | the verdict `display` | most generous in the app — `xxl` / `giant` | the next-session promise | open, reflective, finished |

Two things make this legible rather than theoretical:

1. **The section gap is a phase variable.** Lifting uses `spacing.sm`–`md`; reviewing uses `xxl`–`giant`. Density itself carries the state. This is cheap — it is a number in a style — and it is most of what "the app breathes" means in practice.
2. **The dock reserves the taller of its two heights** (F6). Lifting and resting render into the same box, so the phase change is a ground cross-fade and a content swap with nothing behind it moving. On a large-text device the box grows once, at mount, not at every rest.

---

## 8. Motion language

Five primitives, ≤250 ms, all instant under `reduceMotion`, replacing the two bespoke animations that exist today.

| Primitive | What it does | Duration | Where |
|---|---|---|---|
| **Ground** | cross-fades a background colour. Never moves layout. | 200 ms | lifting ⇄ resting, screen and dock together |
| **Settle** | brief tint in, slow fade out, 2 px rise | 120 ms in / 400 ms out | a set row landing (today's `Landing`, generalised) |
| **Hand-off** | one wash behind the primary action so the eye returns to it | 150 ms in / 500 ms out | rest ending (today's `ReturnHighlight`), a moment resolving |
| **Reveal** | opacity 0→1 with a 4 px rise; the outgoing element fades to 50%. **No height animation.** | 200 ms | advancing to the next exercise, the summary opening |
| **Recount** | a number cross-fades instead of snapping when Forma changed it | 150 ms | the dock's prefill on advance; the next-time value after a Why override |

**Where Forma is completely still**, deliberately:

- Between taps while lifting. Nothing on the workout screen moves while a set is in progress.
- The countdown digits. The bar animates; the numerals never do.
- The exercise list, while the dock is open. It scrolls when the current exercise changes and is otherwise fixed.
- Tier changes in the Why sheet — content swaps, the sheet does not resize with a spring.
- The summary's numbers. **No count-up animation.** A number that ticks up is a slot machine, and docs/15 B5 says noticing is the reward, not spectacle.

Nothing here is allowed to gate input: `Reveal` and `Settle` run behind a live button, and `Complete set` is tappable throughout.

---

## 9. Signature moments

Five. Each is a re-presentation of something the engine already computes.

**M1 · Forma changed its mind.** Teal `FORMA` eyebrow, the line at `title2` over up to three lines, a teal wash behind the block that fades over 5 s, one medium haptic. Fixes F7. Forbidden: an icon, a sparkle, a sound, any hint that an AI did something.

**M2 · First time at this weight.** On arrival, the dock's load stepper's value renders teal for 1.5 s while the line reads *"First time at 80 lb. Get 10 and it stays."* The number the user is about to lift is the thing that changes colour — anticipation, not celebration. When the set lands, `Settle` plays and the teal is gone.

**M3 · Rest.** The whole ground changes, the countdown is 44 pt, the fields mute in place, ticks at 3/2/1, `Rest's up.` with a medium haptic, then `Hand-off` returns the eye to Complete set. Mostly built; V4 extends the ground change past the dock and §7 removes the height jump.

**M4 · A record.** The set row's value promotes to `numTitle` in teal for 1.2 s with a 1 px teal rule appearing at the row's left edge, then settles back to `numBody` with the rule remaining. In the summary the PR highlight gets its own line with the estimated max as `numTitle`. The **number** celebrates; the badge does not. Fixes F8: `StatusPill` stops being how a PR is expressed. Forbidden: confetti, particles, scale-in bounce, trophies, emoji, a full-screen takeover.

**M5 · "I've set next session."** After the evidence, in teal, at `headline`, above the next-time rows, with `spacing.xxl` of air above it so it lands as a closing statement rather than a section header. This is the last thing the user reads and it is the sentence no tracker says.

---

## 10. Before / after

Component-level, current code on the left.

### Home

| Now | Proposed |
|---|---|
| `title2` "Good evening" + `caption` "Build muscle · Week 1" above the card | Greeting drops to `caption` secondary, single line, beside the settings icon. One head on the screen. |
| `Card tone="accent"` — `accentSubtle` fill, `radius.lg` | `DecisionBlock rank="screen"` on plain `bg`. No card, no tint. Teal is the eyebrow and the door only. |
| `readyLine()` at `display`, sentence at `body` secondary, count at `caption` | Unchanged in order; the sentence's load renders through `Measure` at `numTitle` so the number in it is visibly a number. |
| Primary `Button` teal | Ink fill. |
| Two `ListRow`s in a bordered `Card` (Bodyweight, This week) | Same two rows, borderless, `spacing.xxl` below the block, values via `Measure numBody`, dots in neutral until the week is complete. Reads as a footer, not a dashboard. |

### Workout, lifting

| Now | Proposed |
|---|---|
| 56 pt header: chevron / centred title / ellipsis, then full-width `ProgressBar` + "3 of 18 sets" | Chevron and ellipsis stay. The centred title drops to `caption` secondary — it is context. The bar becomes 2 px, hairline-quiet, neutral, flush to the header's bottom edge with the count as `numCaption` inline. Roughly 20 pt returned to the content. |
| `ExerciseBlock` expanded: `bgElevated`, `radius.lg`, `marginHorizontal: sm` | Borderless, on `bg`, aligned to the same left edge as the dock. Grouping comes from the `spacing.xxl` gap to the next collapsed row. |
| Set rows: `caption` index, checkmark, `mono` 17 value | Index → `numCaption` tertiary. Value → `Measure numBody`, unit tertiary. Alignment on the value column so the session reads as a column of numbers. |
| `Stepper`: `bgSunken` + hairline + `radius.md`, 72 pt | Hairline removed. Ground alone. Same height, same targets. |
| RIR field: identical box | Same, and its label drops to `caption` tertiary so it stops competing with the two fields that matter. |
| Dock line: `callout`/`caption`, `numberOfLines={1}` | Quiet line unchanged. Moment lines get up to three lines at `title2` (§4e) and stop truncating. |
| `Button` teal | Ink. |

### Workout, resting

| Now | Proposed |
|---|---|
| Dock ground → `bgElevated`; the rest of the screen unchanged | The **screen** ground cross-fades over 200 ms (`Ground`). The list dims to 60%. Phase readable from across the room. |
| Dock height grows; list padding jumps | Dock reserves the taller height. Nothing behind it moves. |
| `Rest` label + Skip, countdown 44 pt, ±15 buttons, 3 px bar, `Next: …` caption | Same content, `DecisionBlock` grammar: eyebrow `RESTING` in teal, lead = countdown, basis = `Next · 80 lb × 10` with the load via `Measure`, door = Skip. `xl` spacing around the countdown so one thing owns the screen. |

### Summary

| Now | Proposed |
|---|---|
| `label` eyebrow, `display` verdict | Unchanged. It is already right. |
| Highlight rows: `body` name + `body`/600 coloured value | Name `body` secondary; value `Measure numTitle` — the evidence for the verdict becomes visibly the second-largest thing, above the stats. |
| Stats: `caption` tertiary | Unchanged, but numbers through `Measure numCaption`. |
| `NEXT_SESSION_SET` at `headline`, black | Teal, `spacing.xxl` above (M5). |
| Next-time rows inside a bordered `Card` via `ExplainableValue` | `DecisionBlock rank="row"`, borderless, on `bg`. Value `Measure numBody`, delta `numCaption` success, door trailing. |

### Why sheet

| Now | Proposed |
|---|---|
| `short` at `body`, factor box `bgSunken` + `radius.md`, values at `mono` 17 | Order unchanged. Factor values → `Measure numBody`; labels → `caption` secondary. The box loses its fill and gains a 1 px teal rule down its left edge — the citation mark. This is the one place a new graphic device is introduced, and it is a hairline. |
| Section headers `label` uppercase secondary | Unchanged. |

---

## 11. Risks — how this pass could make Forma worse

**R1 · The ink button.** Dropping teal from the primary action is the highest-variance proposal here. It could read as premium and confident, or as a monochrome app with a mysterious green accent nobody can decode. *Guardrail:* implement V3 behind the token layer so it is one commit to revert, and judge it on the phone in both themes before anything else in Tier 1 lands. *Fallback:* keep the teal button and instead remove teal from `ProgressBar`, `Toggle`, `Chip`, `OptionRow` and the tab bar. That gets most of the meaning-separation for none of the risk.

**R2 · Removing borders removes grouping.** The expanded `ExerciseBlock` may stop reading as one unit on a small screen, especially with the collapsed rows immediately above and below. *Guardrail:* borderlessness has to be paid for in space (`spacing.xxl` between blocks, minimum). If the space is not there, keep the border. Verify at 320 pt width and at `maxFontSizeMultiplier` 1.3.

**R3 · `Measure` costs vertical space and can slow scanning.** Stacked units at `numAction`/`numDisplay` are fine; stacked units in a set row would be a disaster. *Guardrail:* units stack only at `numAction` and above; below that they are inline-trailing. And a set row must stay one line.

**R4 · Negative tracking hurts small tabular numbers.** −0.2 at 17 pt is at the edge, and tabular figures rely on even advance widths for column alignment. *Guardrail:* tracking of 0 at `numCaption`, and verify column alignment in the set list before keeping −0.2 at `numBody`.

**R5 · Letting Forma's voice reach `title2` re-opens the chatbot risk.** docs/15 §3 has a hard rule and §4e carves an exception into it. *Guardrail:* the exception is bounded to arrival and record moments, never mid-set, never more than 5 s, never more than one per exercise. If a build ever shows two Forma lines at once, back it out.

**R6 · The rest ground becomes "the teal app".** *Guardrail:* under 3% chroma, judged beside `bg` on the phone, and it is Tier 4 precisely so it can be dropped without touching anything else.

**R7 · Motion slows logging.** Any transition that gates a tap is a regression against a standing constraint. *Guardrail:* `Complete set` is live during every animation; `Reveal` and `Settle` are non-blocking; nothing above 250 ms.

**R8 · Over-applying the Decision Block.** Settings, the exercise catalogue, the swap sheet and the onboarding forms are not decisions Forma made and must not be dressed as them. *Guardrail:* the block is for engine output only. If there is no `Explanation` behind it, it is not a Decision Block.

**R9 · A fixed-height dock plus large text.** Reserving the taller height and `adjustsFontSizeToFit` at `minimumFontScale={0.6}` already fight each other at 1.3× text. *Guardrail:* below a measured height threshold, the dock reverts to its current auto-height behaviour and skips the `Ground` transition. Correctness beats the effect.

### Things I would not do, that would sound good in a design review

A gradient or a ring behind the countdown. A custom display typeface. A glass or blurred dock. Count-up animation on the summary. Per-muscle colour coding. An accent-tinted card on every screen. Any "AI" affordance — sparkle, shimmer, typing indicator — on a deterministic engine. Each of these would read as a fitness app trying to look expensive, which is the opposite of the reference direction.

---

## 12. Recommended implementation order

Ranked by identity gained per unit of work and per unit of risk.

**Tier 1 — the identity. Do these together or do none of them.**

| # | Change | Why first |
|---|---|---|
| 1 | `Measure` + the `num*` ramp; migrate every numeric call site | The most recognisable change in the document and the least risky. Touches ~10 files, no layout logic. |
| 2 | `DecisionBlock`; retrofit Today card, dock, rest, next-time rows | Turns docs/15's central doctrine into something a user can see and a reviewer can check. |
| 3 | The colour law (§5b, §5c) | Makes teal mean something. Ship behind the token layer with R1's fallback ready. |

**Tier 2 — the rhythm.**

| # | Change | Why |
|---|---|---|
| 4 | Reserve the dock's height; `Ground` cross-fade across the whole screen | Fixes F6 and delivers V4, the "tell from across the room" signature. |
| 5 | The five motion primitives, replacing `Landing` and `ReturnHighlight` | Small vocabulary instead of bespoke animations, per the brief. |
| 6 | Borderless workout surfaces; phase-dependent section spacing | Delivers V5 and most of "breathing". |

**Tier 3 — the moments.**

| # | Change | Why |
|---|---|---|
| 7 | M1 arrival treatment (`title2`, three lines, teal wash) | Fixes F7 — currently the app's proudest behaviour is clipped text. |
| 8 | M4 record treatment; `StatusPill` retires from PR duty | Fixes F8. |
| 9 | Summary hierarchy (`numTitle` evidence, teal M5 promise) | Cheap, and it is the last screen of every session. |
| 10 | Home composition: one head, borderless footer | Fixes F9. |

**Tier 4 — optional, judge on device.**

| # | Change |
|---|---|
| 11 | `restGround` token pair |
| 12 | Header reduction (F10): title to `caption`, 2 px bar, ~20 pt returned |
| 13 | Optical tracking on `display`/`title1`/`title2` |

**What is explicitly out of scope for this pass:** the exercise list's collapsed rows still reading as spec (`3 sets of 8–12`) rather than decision — that is a copy and data question flagged in the M3 report, not a visual one; the first-session emptiness, which is a product decision; and anything in M4.

---

## Would it pass the logo test?

Honestly: **after Tier 1, mostly.** A screenshot would show a decision in a repeating three-part shape with a number set in a visibly different material from the words, and one green that appears about six times per screen instead of everywhere. That is unusual enough in this category to be identifiable.

**After Tier 2, yes.** At that point the app changes ground and density with what the user is doing, which nothing else in the category does, and the rest state alone is identifiable.

Tiers 3 and 4 are delight rather than identity. They are the reason someone would enjoy looking at it; Tiers 1 and 2 are the reason they would recognise it.
