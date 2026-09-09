/** Display names for muscle ids. */
export const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Chest',
  lats: 'Lats',
  upper_back: 'Upper back',
  traps: 'Traps',
  front_delts: 'Shoulders',
  side_delts: 'Side delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
  spinal_erectors: 'Lower back',
  neck: 'Neck',
};

export function muscleLabel(id: string): string {
  return MUSCLE_LABEL[id] ?? id.replace(/_/g, ' ');
}

/** Shorter exercise names for sentences: "Incline Dumbbell Press" → "Incline dumbbell press". */
export function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
