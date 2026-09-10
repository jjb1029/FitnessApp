import { measureLabel, spokenUnit, unitLayoutFor } from './numeric';

describe('unitLayoutFor', () => {
  it('stacks the unit only at the two action sizes', () => {
    expect(unitLayoutFor('numAction')).toBe('stacked');
    expect(unitLayoutFor('numDisplay')).toBe('stacked');
  });

  it('keeps the unit inline everywhere a row has to stay one line', () => {
    expect(unitLayoutFor('numCaption')).toBe('inline');
    expect(unitLayoutFor('numBody')).toBe('inline');
    expect(unitLayoutFor('numTitle')).toBe('inline');
  });
});

describe('spokenUnit', () => {
  it('expands weight units', () => {
    expect(spokenUnit('lb')).toBe('pounds');
    expect(spokenUnit('kg')).toBe('kilograms');
  });

  it('expands the effort scales', () => {
    expect(spokenUnit('RIR')).toBe('reps in reserve');
    expect(spokenUnit('RPE')).toBe('RPE');
  });

  it('reads added bodyweight load as added', () => {
    expect(spokenUnit('+lb')).toBe('added pounds');
  });

  it('reads per-side reps as per side', () => {
    expect(spokenUnit('reps / side')).toBe('reps per side');
  });

  it('passes through anything it does not know', () => {
    expect(spokenUnit('sessions')).toBe('sessions');
    expect(spokenUnit('  ')).toBe('');
  });
});

describe('measureLabel', () => {
  it('joins the value and the spoken unit', () => {
    expect(measureLabel('80', 'lb')).toBe('80 pounds');
  });

  it('returns the bare value when there is no unit', () => {
    expect(measureLabel('1:32')).toBe('1:32');
    expect(measureLabel('12', null)).toBe('12');
  });
});
