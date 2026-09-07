import { TIER1_MAX_CHARS } from '@/domain';

import { buildExplanation, renderTemplate } from './index';
import { RULES, type RuleId } from './rules';

describe('explanation registry', () => {
  const ids = Object.keys(RULES) as RuleId[];

  it('has at least one rule', () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it.each(ids)('%s renders a Tier 1 sentence within the limit', (id) => {
    const rule = RULES[id];
    const short = renderTemplate(rule.tier1, rule.sample);
    expect(short.length).toBeLessThanOrEqual(TIER1_MAX_CHARS);
    expect(short).not.toMatch(/\{\w+\}/); // every variable filled
    const sentences = short.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
    expect(short).not.toMatch(/!/); // no exclamation marks
  });

  it.each(ids)('%s has a name and description', (id) => {
    expect(RULES[id].name.length).toBeGreaterThan(3);
    expect(RULES[id].description.length).toBeGreaterThan(40);
  });

  it('builds a valid Explanation for every rule', () => {
    for (const id of ids) {
      const explanation = buildExplanation({ ruleId: id, vars: RULES[id].sample, factors: [{ label: 'Last time', value: '75 × 12 · 12 · 12 @ 2 RIR' }] });
      expect(explanation.ruleId).toBe(id);
      expect(explanation.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('fails on a missing template variable', () => {
    expect(() => renderTemplate('{days} days off', {})).toThrow(/days/);
  });

  it('rejects more than three factors', () => {
    expect(() =>
      buildExplanation({
        ruleId: 'progression.seed',
        factors: [
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
          { label: 'c', value: '3' },
          { label: 'd', value: '4' },
        ],
      }),
    ).toThrow();
  });
});
