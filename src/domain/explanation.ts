import { z } from 'zod';

import { Confidence } from './enums';

/**
 * The explainability contract (docs/12). Every engine decision returns one of
 * these; every recommendation and target snapshot stores one; one UI component
 * (WhySheet) renders them. Tier 1 is `short` + `factors`; Tier 2 is
 * `evidence`, `rule`, `counterfactual`, `alternatives`, `overrideNote`;
 * Tier 3 is `knowledgeItemIds`.
 */

export const TIER1_MAX_CHARS = 180;

export const Factor = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
});
export type Factor = z.infer<typeof Factor>;

export const EvidenceRef = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('set'),
    performedSetId: z.string(),
    date: z.string(),
    label: z.string(), // e.g. "75 lb × 12 @ 2 RIR"
  }),
  z.object({
    kind: z.literal('session'),
    sessionId: z.string(),
    date: z.string(),
    label: z.string(),
  }),
  z.object({
    kind: z.literal('bodyweight'),
    date: z.string(),
    label: z.string(),
  }),
  z.object({
    kind: z.literal('profile'),
    label: z.string(),
  }),
  z.object({
    kind: z.literal('template'),
    label: z.string(),
  }),
]);
export type EvidenceRef = z.infer<typeof EvidenceRef>;

export const Explanation = z.object({
  ruleId: z.string().min(1),
  engineVersion: z.string().min(1),
  confidence: Confidence,
  short: z.string().min(1).max(TIER1_MAX_CHARS),
  factors: z.array(Factor).max(3),
  evidence: z.array(EvidenceRef),
  rule: z.object({ name: z.string().min(1), description: z.string().min(1) }),
  counterfactual: z.string().optional(),
  alternatives: z.array(z.object({ label: z.string(), reason: z.string() })).optional(),
  overrideNote: z.string().optional(),
  knowledgeItemIds: z.array(z.string()),
});
export type Explanation = z.infer<typeof Explanation>;
