import type { NumericSize } from './tokens';

/**
 * Pure helpers behind `<Measure>` (docs/16 §4d). Kept out of the component so
 * the rules — where the unit sits, how it is spoken — are testable.
 */

/** Units stack under the value at action sizes and trail it below that. */
export function unitLayoutFor(size: NumericSize): 'inline' | 'stacked' {
  return size === 'numAction' || size === 'numDisplay' ? 'stacked' : 'inline';
}

const SPOKEN: Record<string, string> = {
  lb: 'pounds',
  kg: 'kilograms',
  rep: 'reps',
  reps: 'reps',
  rir: 'reps in reserve',
  rpe: 'RPE',
  min: 'minutes',
  sets: 'sets',
  set: 'sets',
};

/**
 * Screen-reader form of a unit. Display units are terse ("lb", "reps / side")
 * and several carry a leading "+" for added bodyweight load; both are expanded
 * here so the value is read as a person would say it.
 */
export function spokenUnit(unit: string): string {
  const trimmed = unit.trim();
  if (trimmed.length === 0) return '';
  const added = trimmed.startsWith('+');
  const body = added ? trimmed.slice(1).trim() : trimmed;
  const perSide = /\/\s*side$/i.test(body);
  const base = body.replace(/\/\s*side$/i, '').trim();
  const spoken = SPOKEN[base.toLowerCase()] ?? base;
  return [added ? 'added' : '', spoken, perSide ? 'per side' : ''].filter(Boolean).join(' ');
}

/** The label a screen reader announces for a value and its unit. */
export function measureLabel(value: string, unit?: string | null): string {
  const spoken = unit ? spokenUnit(unit) : '';
  return spoken ? `${value} ${spoken}` : value;
}
