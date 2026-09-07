# 10 · Review of the Four Unresolved Decisions

Status: **for discussion, nothing locked in.** Each section ends with "Decide now?" and "What I would do."

---

## 1. Monetisation model

### Recommendation
Do **not** build billing in Phase 1. Design a single `entitlements` flag set (`coach`, `sync`, `advanced_analytics`) that every gated feature checks, defaulting to "all on" in development and "core only" in production. Decide the actual pricing model at the end of Phase 1 with usage data. The likely eventual model is a **free core with a subscription for the coach and multi-device sync**.

### Why
- The progression engine, programs, and logging are the product's habit-forming core. Charging for them before the app has proven itself will kill retention, and competitors give logging away.
- The coach has a real per-message cost (see 06), so it cannot be free without a cap. Sync has ongoing infrastructure cost. Those two map cleanly onto "premium".
- The only thing that must be true from day one is that gating is *possible* without refactoring. An entitlements check is a few lines; billing integration is weeks.

### Alternatives

| Option | Advantages | Disadvantages | MVP complexity / cost |
|---|---|---|---|
| **A. Free core + subscription (coach, sync, deep analytics)** | Matches cost structure; industry-standard; recurring revenue; core stays free and viral | Subscription fatigue; needs a clear "what do I get" story; coach must feel worth it | RevenueCat or Expo IAP: ~1–2 weeks at M6/Phase 2. RevenueCat is free below ~$2.5k monthly revenue, then 1% |
| **B. One-time purchase / lifetime unlock** | Loved by users; simple; no churn tracking | Cannot cover a per-use AI cost; no recurring revenue for servers | ~1 week; same IAP plumbing |
| **C. Freemium with limits (e.g. 1 program, 30 days history)** | Converts power users | Limits on core logging punish exactly the users you want; feels petty | Same as A plus limit enforcement everywhere: more code, more bugs |
| **D. Fully free, decide later** | Zero distraction; maximum feedback | Coach usage must still be capped; risk of designing something hard to gate | Zero now; the entitlements flag makes this safe |
| **E. Coach credits / pay-per-use** | Cost-aligned; no subscription | Confusing; makes users ration the best feature | Moderate; unusual in consumer apps |

### Decide now?
**Only the small part.** The entitlement flag and the principle "core logging and progression are free" should be decided now because they shape which features get built as gated modules. Pricing, tiers, and billing can wait until the end of Phase 1.

### What I would do
Option A with a generous free tier: everything in Phase 1 free forever; coach and sync in a single "Forma Plus" subscription with a short free trial; a small daily free allowance of coach messages so everyone experiences it. Use RevenueCat to avoid platform billing edge cases. Never gate "Why?" explanations; explainability is the brand.

---

## 2. Backend provider

### Recommendation
**Supabase, but not yet.** Ship Phase 1 with no backend at all. Add Supabase in Phase 2 when the coach requires a server anyway (the Anthropic key cannot live in the app).

### Why
- Phase 1 needs no server for anything the user does. Local SQLite is the source of truth by design.
- Device-loss protection in Phase 1 comes from OS backups (iOS backs up the app's Documents directory to iCloud by default; Android Auto Backup covers app data up to 25 MB, which SQLite with a year of sets fits) plus a manual JSON export/import. That is honest and sufficient for a first release.
- Postponing the backend removes auth, row-level security, sync, account deletion, and privacy-policy surface from Phase 1. That is roughly two weeks saved and a much smaller release.
- Supabase remains the right fit when it arrives: Postgres for relational training data, pgvector if retrieval ever needs it, managed auth with Apple and Google, Edge Functions for the coach, generous free tier.

### Alternatives

| Option | Advantages | Disadvantages | MVP complexity / cost |
|---|---|---|---|
| **Supabase** (Postgres, Auth, Edge Functions) | Relational fit; SQL; open source and self-hostable; Row Level Security; pgvector | Edge Functions are Deno (fine for the Anthropic SDK but some npm packages misbehave); realtime and sync are DIY | Free tier, then $25/month. Auth + tables + one function: ~1–2 weeks |
| **Firebase** (Firestore, Auth, Cloud Functions) | Mature mobile SDKs; offline cache built in; huge ecosystem | Document model fights relational training data; no SQL; vendor lock-in; pricing by reads gets ugly with history queries | Similar effort; costs scale with reads |
| **Convex** | Excellent DX; reactive queries; TypeScript end to end | Proprietary query model; no SQL; smaller ecosystem; less obvious path to self-hosting | Fast to build; pricing fine at MVP scale |
| **Self-hosted Node + Postgres** (Fly, Railway) | Total control; any library; one language | You own auth, migrations, ops, backups, uptime | Most work: 3–4 weeks to equal Supabase basics |
| **PowerSync + Supabase** | Solves multi-device sync properly | Adds a service and a sync-rules layer; unnecessary until multi-device | Phase 3 candidate only |
| **No backend in Phase 1** | Smallest release; nothing to secure | No cloud backup; no coach until Phase 2 | Zero |

### Decide now?
**Provider: can be deferred to Phase 2.** **Phase 1 scope: decide now**, because "no backend in Phase 1" changes the roadmap (M6 shrinks) and removes auth from the data model's critical path. The schema should keep `updated_at`, `deleted_at`, and `version` columns from day one because they are cheap and make later sync trivial; the outbox table itself can be added when sync is built.

### What I would do
No backend in Phase 1; Supabase in Phase 2 with the coach; revisit PowerSync only when multi-device sync is a real user request. Keep the `CoachClient` and `SyncTransport` interfaces so the provider is swappable.

---

## 3. Embeddings provider

### Recommendation
**Do not use embeddings at all for the first version of the knowledge base.** With roughly 50–150 items, put the whole knowledge base in the coach's cached prompt prefix and use deterministic rule-linked and concept-tag selection to highlight the relevant items. Introduce vector retrieval only when the corpus exceeds a few hundred items or the eval shows the model missing relevant items.

### Why
- 50 items × ~300 words ≈ 20–25k tokens. Behind a prompt-cache breakpoint that costs on the order of a cent per turn at cache-read rates and is invisible to latency. Retrieval infrastructure, embeddings, chunking, and re-indexing buy nothing at this size.
- Concept tags and rule links already give "concept, not keyword" retrieval: the engine knows which rules fired; the message maps to concepts via a synonym list. That is deterministic and testable.
- The interface in 07 stays; only the implementation changes from "vector search" to "select from bundle". The knowledge item schema is unchanged.

### Alternatives (for when retrieval is needed)

| Option | Advantages | Disadvantages | Complexity / cost |
|---|---|---|---|
| **Whole KB in cached prompt** (recommended now) | Zero infrastructure; model sees everything; deterministic | Stops scaling around a few hundred items; every turn pays cache-read tokens | Trivial; ~$0.01/turn |
| **Voyage AI** (Anthropic's recommended embedding partner) | High quality; simple API; designed to pair with Claude | Another vendor and key; small ongoing cost | Half a day plus pgvector; cents per month at this scale |
| **OpenAI text-embedding-3** | Ubiquitous; cheap | Second AI vendor in the stack for a tiny job | Same as Voyage |
| **Open-source model in Supabase Edge Functions** (built-in `gte-small`) | Free; no extra vendor; runs where the coach runs | 384 dims, lower quality on long items; slower cold starts | Half a day; free |
| **Postgres full-text search (tsvector) + concept tags** | No embeddings at all; scales to thousands of items | Keyword-bound unless tags are good | Half a day; free |

### Decide now?
**No.** Deferrable to M9 or later. The only thing to fix now is that the retrieval interface returns items plus a `matched` reason, so switching implementations does not touch the coach prompt.

### What I would do
Whole KB in the cached prompt for Phase 2, plus concept-tag highlighting. If retrieval ever becomes necessary, Voyage AI behind the existing interface, or Supabase's built-in embeddings if avoiding another vendor matters more than quality.

---

## 4. Real-lifter testing

### Recommendation
**Yes, and start recruiting now.** Aim for 5–8 people who already lift 3+ times a week and currently use another tracker (Strong, Hevy, a spreadsheet). Testing begins at M3 (first logging build) and runs continuously through Phase 1 as a closed TestFlight / Play internal group.

### Why
- The workout screen is the product. Its problems (reach, tap count, timer behaviour, prefill logic, what happens when you fail a set) are only visible with sweaty hands in a real gym, not in a simulator.
- People switching from another tracker are the target user, and their first reaction to progression suggestions tells you whether the engine's defaults are right.
- It is cheap: a build, a two-line weekly check-in, and reading their session logs.

### Alternatives

| Option | Advantages | Disadvantages | Complexity / cost |
|---|---|---|---|
| **Closed group of 5–8 lifters from M3** (recommended) | Real gym conditions; continuous; catches engine misfires | Recruiting effort; feedback needs triage | ~1 hour/week of your time; free builds via EAS internal distribution |
| **Dogfooding only (you)** | Zero coordination | One body, one gym, one set of habits; blind to what you already know | Free, but the blind spots are exactly where products fail |
| **Paid moderated usability sessions** | Deep observation; skilled moderator | Expensive; lab conditions; one-off | $1–3k per round |
| **Public beta after Phase 1** | Volume of feedback | Too late to change fundamentals; reviews at stake | Free, but risky as the *only* validation |
| **In-app feedback prompts + analytics** | Scales; always on | Tells you what, not why; no gym context | A day of work; complements the group |

### Decide now?
**Yes**, because recruiting takes weeks and the M3 build should land in real hands the week it exists. The decision does not block any code, but it changes the M3 exit criterion from "passes success measures on our devices" to "passes with the test group".

### What I would do
Recruit from your own gym and one online community; ask each tester to log every session for two weeks on Forma alongside nothing else; a three-question weekly check-in ("What slowed you down?", "Any suggestion that felt wrong?", "What did you miss from your old app?"); a shared session-log export so you can see overrides. Test both candidate workout layouts (see 11) with the same group in the first two weeks.

---

## 5. Ads before and after a workout (asked 2026-09-07)

### Is it possible?
Yes. Google AdMob has a maintained React Native SDK (`react-native-google-mobile-ads`) with an Expo config plugin; it needs a development build, not Expo Go. Interstitial ads at "Start workout" and after "Finish" are a supported format. Requirements: AdMob account and app IDs, the iOS App Tracking Transparency prompt, a consent flow for EEA/UK users (Google's UMP SDK, bundled), an updated privacy policy and store data-safety declarations, and a few hundred kilobytes of native SDK.

### What it would earn (rough, US-heavy audience)
Interstitial eCPMs commonly land somewhere between $5 and $20 per thousand impressions, lower outside the US. A user training four times a week with one ad per session sees about 16 ads a month, so roughly $0.10 to $0.30 per active free user per month, before the platform's cut. Two ads per session doubles that. Ad revenue only becomes meaningful with tens of thousands of active free users.

### The cost
- **Before "Start"** it breaks the product's own success measure (two taps to today's workout) and the brief's "premium, calm" feel, at the exact moment the user is most motivated. This is the worst possible placement for this product.
- **After "Finish"** is the least damaging moment, but it lands on the session summary, which is where explainability and PR celebration live. An interstitial there competes with the app's best content.
- Ads on a free tier make the paid tier's pitch partly "remove ads" instead of "get the coach", which cheapens the coach.
- The advertising SDK, consent flow, and tracking prompt add real complexity and privacy surface to Phase 1, which we have just decided to keep free of infrastructure.

### Recommendation
Not in Phase 1, and never before "Start". If ads are ever added: free tier only; one skippable placement after the finish summary is dismissed (not on it); frequency-capped to one per day; never inside the workout screen or on Home; removed by the subscription. Decide after Phase 1 with real retention numbers, because the revenue per user is small and the retention cost is unknown until measured. An A/B test on the free tier in Phase 2 would settle it with data rather than opinion.

### What I would do
Skip ads. The free core is the acquisition engine, the coach is the revenue engine, and interstitials would tax the former to earn a few cents from users who would otherwise convert to the latter.

## Summary

| Decision | Recommended | Decide now? | If it were mine |
|---|---|---|---|
| Monetisation | Free core, entitlement flag now, subscription for coach + sync later | Flag and principle now; pricing later | Free core + single subscription, generous trial and daily coach allowance |
| Backend | Supabase, added in Phase 2; none in Phase 1 | Phase 1 scope now; provider later | Same |
| Embeddings | None; whole KB in cached prompt | No | Same; Voyage later if needed |
| Lifter testing | 5–8 lifters from M3, continuous | Yes (recruiting) | Same, and test two workout layouts with them |
