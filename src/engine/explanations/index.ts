import { Explanation, type Confidence, type EvidenceRef, type Factor } from '@/domain';

import { ENGINE_VERSION } from '../version';
import { RULES, type RuleId, type RuleVars } from './rules';

export { RULES, isRuleId, type RuleId, type RuleVars } from './rules';

export type BuildExplanationInput = {
  ruleId: RuleId;
  vars?: RuleVars;
  confidence?: Confidence;
  factors?: Factor[];
  evidence?: EvidenceRef[];
  counterfactual?: string;
  alternatives?: { label: string; reason: string }[];
  overrideNote?: string;
};

export function renderTemplate(template: string, vars: RuleVars = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    if (v === undefined) throw new Error(`Missing template variable "${key}"`);
    return String(v);
  });
}

/**
 * The only way to create an Explanation. Validates against the domain schema
 * so a rule can never ship without a template or with an over-long Tier 1.
 */
export function buildExplanation(input: BuildExplanationInput): Explanation {
  const rule = RULES[input.ruleId];
  const explanation: Explanation = {
    ruleId: input.ruleId,
    engineVersion: ENGINE_VERSION,
    confidence: input.confidence ?? 'high',
    short: renderTemplate(rule.tier1, input.vars),
    factors: input.factors ?? [],
    evidence: input.evidence ?? [],
    rule: { name: rule.name, description: rule.description },
    counterfactual: input.counterfactual,
    alternatives: input.alternatives,
    overrideNote: input.overrideNote,
    knowledgeItemIds: [...rule.knowledgeItemIds],
  };
  return Explanation.parse(explanation);
}
