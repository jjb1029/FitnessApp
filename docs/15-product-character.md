# 15 · Forma Product Character

Status: **approved and implemented** on 2026-09-08 (character, and all six items in §8). This document sits above docs/14 (the personality audit): 14 defined how Forma speaks, 15 defines what Forma is and therefore how every screen is arranged. Where they conflict, this document wins.

Standing amendment from the approval: "the largest thing is a number" is not a fixed template. The strongest visual hierarchy points at whatever the user is about to act on, which is the set numbers while lifting, the countdown while resting, and the decision when Forma is asking for one.

## 0. The gap this closes

The M3 polish gave Forma a voice. It did not give Forma a shape. The workout screen is still arranged the way every tracker is arranged: a list of the workout, with a data-entry surface attached. Good copy sits on top of that arrangement, so the app reads as a well-mannered tracker.

The difference we want is not more personality per screen. It is that **the screen is built around the decision Forma made, not around the record the user is keeping.** A tracker is a form you fill in. Forma is a plan you follow. That single reframing determines hierarchy, copy, motion, and what we refuse to build.

---

## 1. What Forma believes

Six beliefs. Each one is only real if it is visible, so each carries what you see and what we refuse.

### B1. You should not have to manage your training.
The user brings effort and honesty. Forma brings every decision that precedes the effort: what to train, in what order, how heavy, how long to rest, what changes next time.
- **You see:** no screen asks the user to choose something the engine could decide. Defaults are decisions, not blanks.
- **We refuse:** setup screens, "configure your progression", empty fields waiting for input, choices offered for the sake of flexibility.

### B2. Decide, do not display.
A tracker shows numbers and lets you infer. Forma states the conclusion and puts the numbers underneath it as support.
- **You see:** "80 lb today" is the headline. "Last time 75 × 10, 10, 9" is the support beneath it. Never the reverse.
- **We refuse:** dashboards, stat grids, any screen whose main content is data the user has to interpret.

### B3. One thing at a time, with the next thing in view.
At any moment there is exactly one action. It is the largest thing on screen. What is coming stays visible so the user never loses their place.
- **You see:** one live set, one primary button, one expanded exercise, the rest collapsed but present.
- **We refuse:** hiding the workout to look minimal, and equally, showing everything at once because it is all technically relevant.

### B4. Confidence, with receipts.
Forma commits to a number. It never hedges in the headline. It always shows its reasoning on request, in the user's own data, and always states what would change its mind.
- **You see:** a decisive target, a "Why?" one tap away, and a condition ("If you cannot get 8, I bring it back down").
- **We refuse:** hedged recommendations, unexplained numbers, and reasoning that describes the implementation instead of the evidence.

### B5. Noticing is the reward.
The motivation system is that the app genuinely noticed. Specificity is the proof. A number Forma remembered is worth more than any badge.
- **You see:** "That was better than last time", "New best, up 4 lb", "Every target hit."
- **We refuse:** streaks, badges, XP, levels, confetti, encouragement not backed by data.

### B6. A miss is information, not a failure.
When the user falls short, Forma changes the plan and says what it changed. It never comments on the person.
- **You see:** "Logged. I will account for that next time." Then a lighter target next session, explained.
- **We refuse:** red states for missed targets, "failed set", guilt about skipped days or weeks off.

---

## 2. What makes Forma recognisable

Strip the name, the teal, and the font. What remains should still be identifiable. Three structural signatures.

### S1. The Decision Block
Every meaningful unit of interface in Forma has the same three-part shape, in the same order, at every scale.

```
LEAD    the decision or action        largest thing in the block
BASIS   what it is based on           small, factual, the user's own numbers
DOOR    Why? · change it              one tap, always present, never buried
```

This is the app's rhetorical fingerprint. It repeats on the Today card, the current exercise, each next-time row, every recommendation, and every future coach proposal. Once a user has seen it three times they can read any new Forma screen without instruction. It also becomes an engineering artefact: a `DecisionBlock` component and a review question, "is this a decision block, or did we build a form?"

Concretely:

| Where | Lead | Basis | Door |
|---|---|---|---|
| Today card | Upper A · chest and lats · incline press to 80 lb | 7 exercises, about 48 min | Why? · Do later · Skip |
| Current set | Incline dumbbell press · 80 lb × 10 | 8–12 reps, 2 in reserve. Last time 75 × 10, 10, 9 | Why? · menu |
| Next time row | Incline press · 80 lb | up 5 lb | Why? |
| Rest | 1:32 | Next: 80 lb × 10 | −15 · +15 · Skip |

### S2. The interface changes shape with the activity
Lifting and resting are different layouts, not the same layout with a timer in it. Finishing is a different layout again. The user can tell what phase they are in from across the room, with the phone on a bench.

Most trackers have one layout and change a badge. This is the most visible structural difference and the cheapest to hold onto.

### S3. Numbers are the typography
The largest type in the app is always a number the user is about to act on or just achieved. Not a screen title. Not a section header. A Forma screenshot has one big number that means something.

Corollary: screen titles shrink. "Upper A" is context, not headline. The headline is what you are doing.

### What is deliberately not on the list
Teal, radii, motion curves, and the system font are consequences, not identity. If we changed all four tomorrow and kept S1 to S3, it would still be Forma. If we kept all four and lost S1 to S3, it would not be.

---

## 3. The Forma hierarchy

Your NOW / THEN / AFTER framing is right, with one refinement I want to argue for.

**The refinement:** THEN should not be persistently on screen. Knowing "rest 1:45, then set 3" while you are mid-set is noise, and it competes with NOW for the same attention. THEN belongs to the *transition*: it appears at the moment of completion, when the user's attention is free. AFTER stays constantly present but peripheral, because lifters glance ahead and losing your place is the failure mode of one-thing-at-a-time interfaces.

So the principle becomes:

```
NOW      dominant, always, one per screen
THEN     appears at transitions, owns the screen briefly, then recedes
AFTER    constantly present, never competing
```

Per screen:

| Screen | Dominant (NOW) | Secondary | Present but quiet (AFTER) | Absent by design |
|---|---|---|---|---|
| **Home** | Today's decision and Start workout | The one sentence: what today is and what changed | Bodyweight, week progress | Charts, stat grids, anything from Progress |
| **Current exercise** | The live set: exercise name with weight × reps, and Complete set, as one block | Target range and effort, previous performance | The other exercises, collapsed | Session volume, elapsed time as a headline, four equal-weight actions |
| **Current set** | The numbers, editable in place, and one button | Which set of how many | Completed sets above it | Anything requiring a second screen |
| **Rest** | Time remaining, largest element on screen | Next set's actual numbers | The set list, dimmed | The dock's normal chrome competing for attention |
| **Completion** | The verdict sentence | The evidence, per lift, as changes | Duration, sets, volume | Volume as a headline, a receipt, "1,350 lb lifted" as the lead |
| **Why** | The decision, restated | What Forma saw, in the user's numbers | What changes its mind, then the rule | Rule ids, engine internals, documentation headers above the fold |

**One rule that outranks the others:** Forma's voice never outranks the user's data. The acknowledgement line occupies transitions. In the steady state of lifting, the biggest thing on screen is the set, not a sentence. If a screen ever reads as the app talking while the user is trying to work, we have built a chatbot and we back it out.

---

## 4. The relationship

"The partner who wrote today's plan and is spotting you" is close. Here is the version that can settle arguments.

> **Forma is the person who did the preparation so the user does not have to, and who watches what happens.**

Two duties, and only two: **prepare** and **witness**. Everything Forma does should be traceable to one of them.

The useful mental image is a caddie rather than a coach. A caddie has walked the course, knows the yardage, hands you the club with a number and a read, says it with confidence, and never swings. The player can always overrule and the caddie adjusts without argument. A caddie is silent during the swing.

What this excludes: Forma does not motivate, does not teach technique unasked, does not chat, does not check in on feelings, and does not have opinions about anything outside training.

### Behaviour under pressure

| Situation | Forma's behaviour | Never |
|---|---|---|
| **User succeeds** | Acknowledge once, immediately, specifically. Then get out of the way. Specificity is the whole reward. | Escalating praise. Repeating praise. Praise not backed by a number. |
| **User misses** | State the consequence, not a judgement. The plan absorbs it: "Logged. I will account for that." Then act on it next session. | Red states, "failed", sympathy, asking what went wrong. |
| **User skips** | Reflow without friction and without memory of it as a black mark. "Skipped. Lat pulldown is next." Repeated skips become a program suggestion, never a scold. | Guilt, streak damage, confirmation friction, bringing it up later. |
| **User changes an exercise** | Treat it as information about them. Act on it permanently if asked. Never silently re-suggest something they rejected without saying why. | Re-offering a disliked movement as if the conversation never happened. |
| **User runs out of time** | Forma decides what to cut and reports what it protected: "I kept your two main lifts and dropped four accessory sets." | Handing back a checklist and asking the user to choose what to remove. |
| **User has not trained in a week** | Adjust first, explain second, in one sentence. "Welcome back. I eased today's loads by 10%." | "We missed you." Any reference to the gap as a lapse. |
| **User asks why** | Answer like a person, in a person's order: the decision, what I saw, what would change my mind. Confident and brief. | "The algorithm determined." Leading with the rule name. Documentation structure. |
| **User overrides** | Accept instantly and silently. Then learn from the pattern, and when it changes Forma's behaviour, say so once: "You have gone heavier three times. I have made the jumps bigger." | Arguing, re-suggesting the original, warning, or ignoring the pattern forever. |

The override row is the most Forma-like behaviour in the product. A tracker records what you did. A coach tells you what to do. Forma changes its own mind because of you, and tells you it did.

---

## 5. Five Forma moments

Things a normal tracker fundamentally would not do. I have marked what is buildable from data we already compute, because character should be cashed out of the existing engine rather than new features.

**M1 · Forma changes its own behaviour because of you.**
After three sessions of going heavier than suggested: "You have gone heavier than I suggested three times. I have made the jumps bigger." The app admits its model of you was wrong and corrects it.
*Already computed. `progression.calibrate` exists and fires today; it is presented as one explanation line among many rather than as a moment.*

**M2 · Forma eases the weight before you ask.**
Two tough sessions in a row and the next target comes down on its own, stated plainly: "Two tough sessions. I have eased this to 70 today." No tracker reduces your weight for you and takes responsibility for the decision.
*Already computed. `progression.reduce_load` fires today.*

**M3 · Forma anticipates instead of recording.**
The first time a load goes up, it is announced before the set, not after: "First time at 80. Get 8 and it stays." The moment lands before the effort, which is what a partner does and what a log cannot.
*Buildable now from the target snapshot; needs a first-time-at-this-load check, which is a comparison we already have data for.*

**M4 · Forma hands back time.**
"I have 40 minutes" produces a session with a statement of what was protected: "Kept both main lifts. Dropped four accessory sets." The user gets a decision, not a checklist.
*Needs `compressSession`, planned for M8. Listed here because it is the clearest expression of the character and should not slip further.*

**M5 · The workout ends by changing the future.**
Not a receipt. A verdict, the evidence, and then the thing no tracker says: "I have already set next session." The user leaves knowing the next decision is made.
*Already computed. The data is in the finish summary today; the framing is what changes.*

Note what none of these are: animations, badges, or new screens. Four of five are re-presentations of decisions the engine already makes. That is the point. The character was always in the engine. It has not been reaching the surface.

---

## 6. Before and after: one full flow

The same session, told twice. The generic column is a fair description of what a good tracker does, not a strawman.

### Home

**Generic tracker**
> A list of your routines. "Upper A" with a chevron. Below it, this week's completed workouts and a volume chart. You tap Upper A, review the exercise list, and tap Start.

**Forma**
> **Upper A is ready.**
> Chest and lats today. Incline press goes up to 80 lb.
> *7 exercises, about 48 minutes.*
> **[ Start workout ]**  ·  Why? · Do later
>
> The user learns what today is, that something changed, and that the decision was already made. Two taps of reading, one tap of action.

### First set

**Generic tracker**
> The exercise list appears. Incline Dumbbell Press has three empty rows. A greyed "75 × 10" hints at last time. You tap a field, type 80, tap another, type 10, tap the checkmark.

**Forma**
> **Incline dumbbell press**
> **80 lb × 10**
> *8–12 reps, 2 in reserve. Last time 75 × 10, 10, 9.* · **Why?**
> **[ Complete set ]**
>
> The numbers are already correct because Forma decided them. The user's job is to confirm or adjust, not to fill in. One tap when the plan is right.

### Completing it

**Generic tracker**
> The row turns green. A timer starts counting down in a bar. The next row becomes active.

**Forma**
> The set lands with a tick. For two seconds the block reads **Good set.** and the phone gives a short pulse. Then the screen changes shape.

### Rest

**Generic tracker**
> A progress bar and "1:32" in a corner of the same screen. Everything else is unchanged. You wait, glancing at a number the size of a caption.

**Forma**
> The whole lower surface becomes recovery.
> **1:32** at the size of a headline.
> *Next: 80 lb × 10.*
> −15 · +15 · Skip
>
> Resting is a phase of the workout with its own screen state. At three seconds the phone ticks. At zero: **Rest's up.**, one pulse, and the action returns lit.

### Next set

**Generic tracker**
> You tap the next empty row and type the numbers again.

**Forma**
> The set is already loaded with what you just did. **Set 2 of 3.** One tap if nothing changed.

### Finish

**Generic tracker**
> A summary card: duration 47:12, volume 12,480 lb, 18 sets, 1 PR. A share button. Done.

**Forma**
> **You got stronger today.**
> Incline press · +1 rep at 80 lb
> Lat pulldown · new best, 140 lb
> *47 minutes · 18 sets*
>
> **I have set next session.**
> Incline press → 85 lb · Why?
> Lat pulldown → 145 lb · Why?
>
> **[ Done for today ]**
>
> The session closes by telling the user the next decision is already made. Nothing to plan, nothing to remember.

The difference in one line: **the generic flow is a form the user fills in; the Forma flow is a plan the user follows, that adjusts because of what they did.**

---

## 7. Where this could go wrong

Four failure modes, with the guardrail for each. These are review questions, not aspirations.

| Risk | Guardrail |
|---|---|
| **Decide-do-not-display hides data lifters want.** | Everything removed from the surface is exactly one tap away, never two. Previous performance, targets, and volume stay reachable without navigation. |
| **One-thing-at-a-time loses the user's place.** | AFTER is always visible. The user can see the whole session's shape without scrolling into it. |
| **Confidence becomes wrongness delivered smugly.** | Confidence lives in the decision, honesty lives in the reasoning, and the counterfactual is never optional. Every decision states what would reverse it. |
| **The voice becomes a personality that talks.** | Forma speaks at transitions only. If a line would appear while the user is mid-effort, it does not ship. Silence is the default state. |

---

## 8. What this changes about what we already built

The M3 polish stands. This lens changes emphasis in six specific places. Each is small, and none is a redesign. Listed for approval, not implemented.

1. **The current set becomes one block.** The exercise name moves into the action surface so that "what I am doing right now" is a single unit: name, weight × reps, Complete set. The set history stays in the block above it, which is where lifters actually look for it.
2. **The set numbers become the largest thing on the workout screen.** Currently the exercise title is the largest type and the numbers sit in a 28 pt field below it. Invert.
3. **The Why sheet is reordered to a person's answer.** Decision, then "here is what I saw" in the user's numbers, then what changes my mind. The rule and its description move behind one more tap. Right now the counterfactual sits third; it should be second.
4. **The finish leads with the verdict and the evidence, and adds the promise.** "You got stronger today", the per-lift changes, then "I have set next session" above the next-time rows. Duration and volume drop to a caption.
5. **The Today card leads with readiness, not the schedule.** "Upper A is ready" as the lead, the sentence as basis, exercise count and duration as caption.
6. **Three of the five Forma moments get promoted from explanation text to moments.** Calibration, the unprompted ease-off, and first-time-at-this-weight already fire in the engine and currently read as one more line of explanation.

Everything in that list is presentation. The engine does not change.

---

## 9. The test

For any future screen, three questions:

1. **What is the one decision or action on this screen?** If there is more than one, or none, redesign it.
2. **Is the decision larger than the data that supports it?** If not, invert it.
3. **Can the user ask why, and would the answer sound like a person?** If not, it is not finished.
