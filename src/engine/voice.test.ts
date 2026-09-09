import { finishVerdict, gradeSet, setAcknowledgement, targetLine, todayLine, whyTitle } from './voice';

const range = { min: 8, max: 12 };

describe('voice · gradeSet', () => {
  it('grades against the range', () => {
    expect(gradeSet({ reps: 7, loadKg: 34, repRange: range })).toBe('below');
    expect(gradeSet({ reps: 10, loadKg: 34, repRange: range })).toBe('hit');
    expect(gradeSet({ reps: 13, loadKg: 34, repRange: range })).toBe('above');
    expect(gradeSet({ reps: 10, loadKg: 34, repRange: range, edit: true })).toBe('edit');
  });

  it('recognises better than last time only when it is', () => {
    expect(gradeSet({ reps: 10, loadKg: 34, repRange: range, previous: { reps: 9, loadKg: 34 } })).toBe('better');
    expect(gradeSet({ reps: 9, loadKg: 36, repRange: range, previous: { reps: 9, loadKg: 34 } })).toBe('better');
    expect(gradeSet({ reps: 10, loadKg: 32, repRange: range, previous: { reps: 9, loadKg: 34 } })).toBe('hit');
    expect(gradeSet({ reps: 9, loadKg: 34, repRange: range, previous: { reps: 9, loadKg: 34 } })).toBe('hit');
  });
});

describe('voice · lines', () => {
  it('acknowledges by outcome and never with exclamation marks', () => {
    for (const outcome of ['hit', 'above', 'better', 'below', 'edit'] as const) {
      for (let i = 0; i < 4; i++) {
        const line = setAcknowledgement({ outcome, setIndex: i, setsRemaining: 2 });
        expect(line).not.toMatch(/!/);
        expect(line.length).toBeLessThan(60);
      }
    }
    expect(setAcknowledgement({ outcome: 'hit', setIndex: 0, setsRemaining: 1 })).toBe('Nice. One more.');
    expect(setAcknowledgement({ outcome: 'below', setIndex: 0, setsRemaining: 2 })).toMatch(/account for that/);
  });

  it('is deterministic for the same seed', () => {
    expect(setAcknowledgement({ outcome: 'hit', setIndex: 1, setsRemaining: 2 })).toBe(setAcknowledgement({ outcome: 'hit', setIndex: 1, setsRemaining: 2 }));
  });

  it('writes the target line from the rule', () => {
    expect(targetLine({ ruleId: 'progression.seed', loadDisplay: null, previousLoadDisplay: null, reps: 8, targetRir: 2, isBodyweight: false })).toBe('Pick a weight you can do 8 with room to spare.');
    expect(targetLine({ ruleId: 'progression.double.increase_load', loadDisplay: '80 lb', previousLoadDisplay: '75 lb', reps: 8, targetRir: 2, isBodyweight: false })).toBe('80 lb today. Up from 75 lb.');
    expect(targetLine({ ruleId: 'progression.double.add_rep', loadDisplay: '75 lb', previousLoadDisplay: '75 lb', reps: 11, targetRir: 2, isBodyweight: false })).toBe('75 lb today. Aim for 11.');
    expect(targetLine({ ruleId: 'progression.layoff', loadDisplay: '70 lb', previousLoadDisplay: '80 lb', reps: 8, targetRir: 2, isBodyweight: false })).toBe('70 lb today. Eased after time off.');
  });

  it('titles the Why sheet with the decision', () => {
    expect(whyTitle({ ruleId: 'progression.double.increase_load', loadDisplay: '80 lb', when: 'today', isBodyweight: false })).toBe('80 lb today');
    expect(whyTitle({ ruleId: 'progression.hold_after_miss', loadDisplay: '75 lb', when: 'next time', isBodyweight: false })).toBe('Hold at 75 lb');
    expect(whyTitle({ ruleId: 'progression.seed', loadDisplay: null, when: 'today', isBodyweight: false })).toBe('Starting load');
  });

  it('gives a finish verdict from the session data', () => {
    expect(finishVerdict({ workingSets: 12, allTargetsHit: true, increases: 2, earlyFinish: false, prCount: 0 })).toBe('Every target hit. 2 lifts go up next time.');
    expect(finishVerdict({ workingSets: 12, allTargetsHit: false, increases: 0, earlyFinish: false, prCount: 1 })).toBe('You got stronger today.');
    expect(finishVerdict({ workingSets: 3, allTargetsHit: true, increases: 0, earlyFinish: true, prCount: 0 })).toBe('Good stopping point. Nothing is lost.');
    expect(finishVerdict({ workingSets: 0, allTargetsHit: false, increases: 0, earlyFinish: true, prCount: 0 })).toMatch(/Nothing logged/);
  });

  it('writes the Today sentence', () => {
    expect(todayLine({ focus: ['Chest', 'Lats'], increases: [{ name: 'Incline press', loadDisplay: '80 lb' }], firstSession: false, welcomeBackPercent: null })).toBe('Chest and lats. Incline press goes up to 80 lb.');
    expect(todayLine({ focus: ['Quads', 'Hamstrings', 'Calves'], increases: [], firstSession: false, welcomeBackPercent: null })).toBe('Quads, hamstrings, and calves. Same weights as last time. Add a rep where you can.');
    expect(todayLine({ focus: [], increases: [], firstSession: true, welcomeBackPercent: null })).toBe('Your first session. Find your weights and I will take it from there.');
    expect(todayLine({ focus: ['Chest'], increases: [], firstSession: false, welcomeBackPercent: 10 })).toMatch(/eased today's loads by 10%/);
  });
});
