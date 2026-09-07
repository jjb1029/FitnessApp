import { defaultWeightUnitForLocale, displayLoad, formatLoad, incrementStepInUnit, kgToLb, lbToKg, roundToStep } from './units';

describe('units', () => {
  it('round-trips a pound entry through kilograms without drift', () => {
    const kg = lbToKg(75);
    expect(displayLoad(kg, 'lb', 2.5)).toBe(75);
    expect(displayLoad(kg, 'lb', 1.25)).toBe(75);
    expect(kgToLb(lbToKg(135))).toBeCloseTo(135, 6);
  });

  it('rounds to the practical increment in the display unit', () => {
    expect(incrementStepInUnit(2.5, 'lb')).toBe(5);
    expect(incrementStepInUnit(1.25, 'lb')).toBe(2.5);
    expect(incrementStepInUnit(5, 'lb')).toBe(10);
    expect(incrementStepInUnit(1, 'lb')).toBe(2.5);
    expect(incrementStepInUnit(2.5, 'kg')).toBe(2.5);
    expect(displayLoad(34.5, 'lb', 2.5)).toBe(75); // 34.5 kg ≈ 76.06 lb → nearest 5
    expect(displayLoad(34.5, 'kg', 2.5)).toBe(35);
  });

  it('roundToStep avoids floating artefacts', () => {
    expect(roundToStep(77.5000001, 2.5)).toBe(77.5);
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(roundToStep(10, 0)).toBe(10);
  });

  it('formats loads and bodyweight', () => {
    expect(formatLoad(lbToKg(80), 'lb', 2.5)).toBe('80 lb');
    expect(formatLoad(60, 'kg', 2.5)).toBe('60 kg');
    expect(formatLoad(null, 'lb')).toBe('BW');
  });

  it('defaults units from locale', () => {
    expect(defaultWeightUnitForLocale('en-US')).toBe('lb');
    expect(defaultWeightUnitForLocale('en-GB')).toBe('kg');
    expect(defaultWeightUnitForLocale('de_DE')).toBe('kg');
    expect(defaultWeightUnitForLocale(undefined)).toBe('kg');
  });
});
