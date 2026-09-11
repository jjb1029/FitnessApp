import { STATE_TRANSITION_BUDGET_MS, handOffTimeline, motionDuration, reservedDockHeight, shouldRecount, type MotionKind } from './motionPlan';

const kinds: MotionKind[] = ['recount', 'settle', 'handOffOut', 'handOffIn', 'reveal', 'ground'];

describe('motion budget', () => {
  it('keeps every primitive inside the state-transition budget', () => {
    for (const kind of kinds) expect(motionDuration(kind, false)).toBeLessThanOrEqual(STATE_TRANSITION_BUDGET_MS);
  });

  it('lands a whole hand-off inside the budget', () => {
    expect(handOffTimeline(false).total).toBeLessThanOrEqual(STATE_TRANSITION_BUDGET_MS);
  });

  it('brings the primary change in before its supporting information', () => {
    const t = handOffTimeline(false);
    expect(t.inDelay).toBeLessThan(t.revealDelay);
  });

  it('lets the outgoing state leave before the incoming one has finished arriving', () => {
    const t = handOffTimeline(false);
    expect(t.out).toBeLessThan(t.inDelay + t.in);
  });
});

describe('reduced motion', () => {
  it('zeroes every primitive', () => {
    for (const kind of kinds) expect(motionDuration(kind, true)).toBe(0);
  });

  it('turns a hand-off into an instant state change', () => {
    expect(handOffTimeline(true)).toEqual({ out: 0, inDelay: 0, in: 0, revealDelay: 0, reveal: 0, ground: 0, total: 0 });
  });
});

describe('shouldRecount', () => {
  it('stays still on first render', () => {
    expect(shouldRecount(null, { trigger: 'set-1', value: '80' })).toBe(false);
  });

  it('stays still while the user nudges the value', () => {
    expect(shouldRecount({ trigger: 'set-2', value: '80' }, { trigger: 'set-2', value: '85' })).toBe(false);
  });

  it('stays still when the next set is prefilled with the same number', () => {
    expect(shouldRecount({ trigger: 'set-2', value: '85' }, { trigger: 'set-3', value: '85' })).toBe(false);
  });

  it('recounts when Forma moves on to a different number', () => {
    expect(shouldRecount({ trigger: 'incline:set-3', value: '85' }, { trigger: 'pulldown:set-1', value: '140' })).toBe(true);
  });
});

describe('reservedDockHeight', () => {
  it('reserves the controls plus the tallest stage', () => {
    expect(reservedDockHeight(150, [66, 141])).toBe(291);
  });

  it('ignores stages that have not measured yet', () => {
    expect(reservedDockHeight(150, [0, Number.NaN, 66])).toBe(216);
  });

  it('rounds up so a fractional layout never clips the last row', () => {
    expect(reservedDockHeight(150.2, [66.1])).toBe(217);
  });
});
