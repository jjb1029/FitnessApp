import type { LengthUnit, WeightUnit } from '@/domain';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

export function cmToUnit(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cm / CM_PER_IN;
}

export function unitToCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_IN;
}

/** Round a value to the nearest multiple of `step` (e.g. 2.5). */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const rounded = Math.round(value / step) * step;
  // Avoid floating artefacts such as 77.50000000001.
  return Number(rounded.toFixed(3));
}

/**
 * Convert a canonical kg load to the user's unit, rounded to the exercise's
 * increment in that unit. This is the only path loads take to the screen, so
 * 75 lb never redisplays as 74.99 lb.
 */
export function displayLoad(kg: number, unit: WeightUnit, incrementKg: number): number {
  const step = incrementStepInUnit(incrementKg, unit);
  return roundToStep(kgToUnit(kg, unit), step);
}

/** Practical increment in the display unit: 2.5 kg → 5 lb, 1.25 kg → 2.5 lb, etc. */
export function incrementStepInUnit(incrementKg: number, unit: WeightUnit): number {
  if (unit === 'kg') return incrementKg;
  const lb = kgToLb(incrementKg);
  // Snap to the nearest of the plate-friendly lb steps.
  const steps = [1, 2.5, 5, 10];
  let best = steps[0]!;
  for (const s of steps) if (Math.abs(s - lb) < Math.abs(best - lb)) best = s;
  return best;
}

export function formatLoad(kg: number | null, unit: WeightUnit, incrementKg = 1.25): string {
  if (kg === null) return 'BW';
  const value = displayLoad(kg, unit, incrementKg);
  return `${trimNumber(value)} ${unit}`;
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  return `${kgToUnit(kg, unit).toFixed(decimals)} ${unit}`;
}

export function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/** Locale-based default unit: US, Liberia, and Myanmar use pounds. */
export function defaultWeightUnitForLocale(locale: string | undefined): WeightUnit {
  const region = locale?.split(/[-_]/)[1]?.toUpperCase();
  return region === 'US' || region === 'LR' || region === 'MM' ? 'lb' : 'kg';
}
