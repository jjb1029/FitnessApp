# 07 · Knowledge Base Architecture

## 1. Goals

- Hold curated, sourced fitness knowledge separately from code and from the model's general knowledge.
- Retrieve by concept, not only keyword, so "why aren't my arms growing" pulls volume, frequency, exercise selection, recovery, and nutrition items.
- Attach source metadata and evidence quality to every item, and never fabricate a citation.
- Expand and correct without an app release.

## 2. Knowledge item schema

Items are authored as Markdown files with YAML frontmatter in `packages/knowledge/items/<topic>/<slug>.md`. A build step validates them with Zod and emits `knowledge.json`; the `knowledge-index` function embeds and upserts them into Postgres.

```yaml
id: volume.weekly-set-ranges            # stable, dotted, topic-prefixed
title: Weekly set ranges per muscle
topic: volume                           # controlled vocabulary, see 3
subtopics: [hypertrophy, landmarks]
concepts: [training-volume, weekly-sets, minimum-effective-volume, maximum-recoverable-volume, diminishing-returns]
applies_to:                             # optional targeting
  goals: [build_muscle, recomp]
  experience: [intermediate, advanced]
kind: principle                         # principle | definition | guideline | explanation | caution | faq
claim_type: recommendation              # established | recommendation | uncertain | medical-boundary
evidence_quality: moderate              # strong | moderate | limited | expert-opinion | unknown
confidence: medium                      # how confident we are in the *wording* of this item
sources:                                # empty array allowed; never invented
  - type: review                        # rct | meta-analysis | review | textbook | guideline | expert | none
    title: ""
    authors: ""
    publication: ""
    year: null
    url: ""
    note: "Needs citation review before public launch"
rule_ids: [volume.band.low, volume.band.high]   # engine rules this item explains
last_reviewed: 2026-09-07
reviewed_by: ""
status: draft                           # draft | reviewed | published | deprecated
notes: ""
---
Body: 150–400 words of plain-language explanation, written to be quoted to a user.
Use "typically", "many people", "the evidence suggests" as the evidence quality warrants.
End with a one-line "What this means for you" template the coach can adapt.
```

Rules for authors:
- One idea per item. Cross-reference by `id`, not by copying text.
- `claim_type: established` requires at least one source with `evidence_quality` strong or moderate.
- Items with empty `sources` must be `status: draft` and are still retrievable in development builds, but the coach labels them as "general guidance" until reviewed.
- Medical-boundary items contain the safe response pattern, not medical content.

## 3. Topic vocabulary (initial)

`exercise-science` · `hypertrophy` · `strength` · `progressive-overload` · `rir-rpe` · `volume` · `frequency` · `exercise-selection` · `substitution` · `fatigue` · `recovery` · `deload` · `cardio` · `energy-balance` · `protein` · `macronutrients` · `cutting` · `bulking` · `maintenance` · `recomposition` · `bodyweight-trends` · `goal-setting` · `general-fitness` · `safety`

Concepts are free-form tags drawn from a maintained list (`concepts.json`) so retrieval can expand queries (e.g. `arms` → `biceps`, `triceps`, `elbow-flexion`).

## 4. Storage and indexing

Postgres tables in Supabase:
- `knowledge_items(id, title, topic, subtopics[], concepts[], applies_to jsonb, kind, claim_type, evidence_quality, confidence, sources jsonb, rule_ids[], body, status, last_reviewed, version)`
- `knowledge_embeddings(item_id, chunk_index, embedding vector(1024), chunk_text)` — one embedding for the whole item plus one per chunk for long items
- `knowledge_concepts(concept, synonyms[], related[])`

Embeddings provider sits behind an `EmbeddingProvider` interface. Anthropic does not offer an embeddings endpoint; the default implementation uses Voyage AI (`voyage-3` family, 1024 dims), with the provider swappable without re-authoring content. Re-indexing is idempotent and triggered by CI on merge to main.

The app also ships a compact **offline subset**: items linked from engine `rule_ids` (so every "Why?" can show its knowledge item without a network), bundled as JSON at build time.

## 5. Retrieval interface

```ts
interface KnowledgeRetriever {
  search(q: KnowledgeQuery): Promise<KnowledgeHit[]>;
  getByIds(ids: string[]): Promise<KnowledgeItem[]>;
  getForRule(ruleId: string): Promise<KnowledgeItem[]>;
}

type KnowledgeQuery = {
  text?: string;                 // the user's message or a rewritten query
  concepts?: string[];           // explicit concept tags (from the engine or the message)
  topics?: string[];
  goal?: GoalType; experience?: Experience;
  limit?: number;                // default 6
  minStatus?: "draft" | "reviewed" | "published";
};

type KnowledgeHit = { item: KnowledgeItem; score: number; matched: ("semantic" | "concept" | "rule")[] };
```

Retrieval is hybrid and deterministic in ordering:
1. **Rule-linked** items for any `ruleId` present in the context (pending recommendations, targets the user is asking about) — always included.
2. **Concept expansion**: extract concepts from the message with a synonym map; fetch items whose `concepts` overlap.
3. **Semantic**: embed the message (plus the last assistant turn for follow-ups) and take nearest neighbours filtered by `applies_to`.
4. Merge, de-duplicate, weight (rule 1.0, concept 0.8, semantic 0.7 × cosine), cap at `limit`, and return with `matched` reasons so the coach prompt can cite which items it used.

The coach function passes hits into the user turn as `<knowledge>` blocks with `id`, `claim_type`, `evidence_quality`, and body. The model is instructed to reflect evidence quality in its wording.

## 6. Seed content plan (Phase 2, ~50 items)

| Topic | Items |
|---|---|
| progressive-overload | what it is; double progression; when to add load vs reps; layoffs |
| rir-rpe | definition; why we use RIR; typical targets by goal; common misreporting |
| volume | weekly set ranges (advisory); direct vs indirect; signs of too much / too little |
| frequency | per-muscle frequency; splitting volume across days |
| exercise-selection | compound vs isolation; stability and fatigue cost; why we swap within pattern |
| substitution | preserving stimulus; discomfort vs pain (safety) |
| fatigue / deload | signals; what a deload is; how we schedule it |
| recovery | sleep, stress, general guidance (with medical boundary) |
| energy-balance / protein / macronutrients | basics; protein targets as ranges; why trends not days |
| cutting / bulking / maintenance / recomposition | rates of change; expectations; who recomp suits |
| bodyweight-trends | 7-day average; water and glycogen; when to adjust |
| goal-setting / general-fitness | realistic timelines; consistency over optimisation |
| safety | pain, injury, medical conditions, disordered eating, supplements: boundary responses |

Each seed item starts as `status: draft` with honest `sources` (empty where the author has not verified a citation). A review pass before public launch attaches real sources or downgrades `claim_type`.

## 7. Governance

- Content changes are pull requests to `packages/knowledge`, validated by the build (schema, unique ids, valid `rule_ids`, no `established` without sources).
- `knowledge-index` records `version` per item; the coach logs which item versions it used per message for auditability.
- A `deprecated` status keeps ids resolvable (old explanations still render) while removing the item from retrieval.
