# 06 · AI Architecture

## 1. Role of AI in the product

The AI coach is a *conversational interface over the training engine and the knowledge base*, not the decision maker. It:
- explains what the engine decided and why, in the user's terms,
- answers questions by combining retrieved knowledge with the user's actual data,
- turns user intent ("I only have 40 minutes", "I hate this exercise") into engine calls,
- proposes program changes as structured actions that the engine validates and the user confirms.

It never invents training history, never applies changes directly, and never gives medical advice.

## 2. Three-layer knowledge system

| Layer | Lives in | Who owns it |
|---|---|---|
| **Knowledge** — principles, definitions, explanations with sources and evidence quality | `packages/knowledge` → Postgres + pgvector | Content, reviewed |
| **Training rules** — deterministic logic | `packages/engine` | Engineering, unit-tested |
| **User data** — sessions, sets, bodyweight, goals | Device SQLite (and mirror) | The user |

The coach retrieves from layer 1, calls layer 2 through tools, and receives layer 3 as a structured snapshot. It reasons over all three but cannot modify any of them.

## 3. Runtime topology

```
Mobile app                                  Supabase Edge Function `coach`
┌──────────────────────┐   HTTPS/SSE        ┌───────────────────────────────┐
│ CoachScreen          │ ─────────────────► │ 1 validate + auth              │
│ ContextAssembler     │  {message,         │ 2 retrieve knowledge (pgvector)│
│  (engine + repos)    │   snapshot,        │ 3 build prompt (cached prefix) │
│ ActionApplier        │   conversationId}  │ 4 Claude: stream, tools        │
│  (engine validates,  │ ◄───────────────── │ 5 emit text + proposed_actions │
│   user confirms)     │  SSE: text deltas, └───────────────┬───────────────┘
└──────────────────────┘  actions, usage                    │ Anthropic API
                                                            ▼
```

**Phase 2 (ship first):** the app assembles a compact **context snapshot** and sends it with each message. The function retrieves knowledge, calls Claude once (with optional server-side engine tools), streams text, and returns structured `proposed_actions`. Simple, stateless per request, easy to cache.

**Phase 3 (extend):** client-executed tools. The function returns `tool_use` requests over the stream; the app runs them against local SQLite and the engine, posts results, and the loop continues. This lets the coach dig into arbitrary history without shipping it all in the snapshot. The prompt, tools, and action schema stay the same, so this is additive.

## 4. Context snapshot (assembled on device)

Built by `ContextAssembler` from repositories and engine outputs, serialised as JSON, size-capped (~6–8k tokens), and hashed so repeated turns reuse it:

- Profile: goal, experience, days/week, session length, units, intensity scale, limitations (as entered)
- Active program: name, split, days with exercises and current targets
- Last 6 sessions: date, day name, per-exercise working sets (load, reps, RIR), swaps, compression
- Engine outputs: per-exercise next targets *with explanations*, weekly volume per muscle with band, stagnation flags, fatigue score and signals, pending recommendations
- Bodyweight: 7-day average, 4-week rate of change, entries count
- Nutrition (Phase 3): 21-day averages when an integration exists, else `"unavailable"`
- Preferences: likes, dislikes, avoids with reasons
- Today: date, whether a session is in progress, minutes available if stated

Anything not present is sent as an explicit `null`/`"unavailable"` so the model can say "I don't have that data" instead of guessing. The snapshot deliberately excludes free-text notes unless the user's message references a session.

## 5. Claude API usage (server side, TypeScript SDK)

- **Model:** `claude-opus-5` for coach turns. Adaptive thinking on by default; `output_config.effort: "medium"` for chat turns (latency-sensitive, snapshot-grounded), raised to `"high"` when the turn produces program-change actions. Re-tune with an eval before changing.
- **Streaming** always (`client.messages.stream`), forwarded as SSE to the app.
- **Prompt caching:** stable system prompt + tool definitions + knowledge-style guidelines first with a cache breakpoint; the per-user snapshot after it; the conversation last. Retrieved knowledge goes in the user turn so it does not invalidate the prefix.
- **Structured output** for proposed actions: the model writes prose plus a final `propose_actions` tool call whose input is validated with Zod against the shared `RecommendationPayload` schemas (`strict: true`). Anything that fails validation is dropped and logged; nothing invalid reaches the user.
- **Server-side engine tools (Phase 2):** `rank_substitutes`, `compress_session`, `explain_target`, `compute_volume` — thin wrappers over `packages/engine` running in the function against the snapshot, so the model's numbers are the engine's numbers.
- **Refusal handling:** check `stop_reason` before reading content; on `refusal` return a neutral message to the app. Server-side fallbacks (`fallbacks: "default"`) are enabled so a classifier refusal on a benign fitness question still produces an answer.
- **Fable-class models** are not used for chat; if adopted later, remember they reject forced `tool_choice` and require append-only history.
- **Conversation memory:** the function stores messages in `coach_messages`; the app sends only the `conversationId` and the last user message. History is trimmed to the last ~20 turns plus a rolling summary; server compaction (`compact-2026-01-12`) is an option once conversations get long.
- **Budget:** `max_tokens` 4096 for chat turns. Usage recorded per message for cost monitoring; a per-user daily cap protects against runaway cost.

## 6. System prompt contract (summary)

The system prompt defines persona and boundaries, not fitness facts. Key clauses:
1. You are the coach inside this app. You have the user's real data in `<context>`; use only that. If data is absent, say so.
2. Distinguish, in wording, between (a) established principles from `<knowledge>` with their evidence level, (b) your recommendation, (c) uncertainty. Never present (b) as (a).
3. Numbers about the user (loads, sets, trends) must come from the context or from a tool result. Do not compute new training numbers yourself; call a tool.
4. Changes to the program or targets are proposals. Emit them with `propose_actions`; tell the user they can apply or keep current. Never claim a change has been made.
5. Medical boundary: for pain beyond normal discomfort, injury, illness, medication, pregnancy, disordered eating, or rapid weight-loss requests, respond with care, do not diagnose or prescribe, and recommend a qualified professional. Continue to help with what is safe.
6. Plain English, short answers, no jargon unless the user uses it or `advanced_mode` is on. Match the user's units.

## 7. Safety and guardrails

- **Input classification** is done by the model within the same turn (no separate classifier at first); the prompt's boundary rules plus a Zod-validated action schema are the primary controls.
- **Action validation:** every proposed action is re-run through the engine on device before it is shown (`ActionApplier.validate`). Invalid or out-of-bounds actions (load jumps > 2 increments, sets > 8 per exercise, calorie changes > 500 kcal/day) are shown as "The coach suggested X but it is outside safe defaults" with the option to edit manually.
- **Nutrition:** calorie/protein target changes are always `confirmed_at`-gated by the user (Phase 3).
- **Rate limits and cost caps** per user; graceful "Coach is busy" state.
- **Privacy:** the snapshot contains no name, email, photos, or free-text limitations beyond chips unless relevant; the API request is not used for training under Anthropic's API terms; users can delete conversations.
- **Offline:** the Coach tab shows history and a clear "Coach needs a connection" state; recommendation explanations from the engine remain available offline because they are generated on device.

## 8. Evaluation

A small eval set (`backend/evals/coach`) of ~40 prompts with snapshots covering: explain a target, request compression, swap with each reason, plateau question, medical boundary cases, absent-data questions, unit handling. Graded on: grounded numbers, correct action schema, boundary compliance, tone. Run before model or prompt changes. Built with the claude-api skill's eval guidance when Phase 2 starts.

## 9. Explainability contract

- When the user asks "why" about a target or recommendation, the coach answers from the stored `Explanation` object included in the snapshot. It may paraphrase Tier 1–2 content in conversation but every number must match the stored object; it does not re-derive decisions.
- Every proposed action must carry a complete `Explanation` produced by an engine tool (`explain_target`, `rank_substitutes`, `compress_session`, and so on). The app rejects any action without one before display, so coach proposals render in the same `WhySheet` as engine recommendations.
- Knowledge items the coach cites are referenced by id so Tier 3 of the sheet shows the same sources the coach used.

## 10. What is intentionally not AI

Program selection, load targets, volume counting, PR detection, stagnation and fatigue flags, and substitution ranking are all deterministic engine outputs. The coach explains and orchestrates them. This keeps the core loop offline, cheap, testable, and consistent.
