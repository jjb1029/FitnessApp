import type { Equipment, Muscle } from '@/domain';

/**
 * Advisory weekly working-set ranges (docs/05 §5). These are typical ranges,
 * not physiological rules; the UI always says "typical range".
 */
export const MUSCLE_SEED: Muscle[] = [
  { id: 'chest', name: 'Chest', group: 'upper_push', weeklyRangeMin: 10, weeklyRangeMax: 20 },
  { id: 'lats', name: 'Lats', group: 'upper_pull', weeklyRangeMin: 10, weeklyRangeMax: 20 },
  { id: 'upper_back', name: 'Upper back', group: 'upper_pull', weeklyRangeMin: 10, weeklyRangeMax: 20 },
  { id: 'traps', name: 'Traps', group: 'upper_pull', weeklyRangeMin: 4, weeklyRangeMax: 12 },
  { id: 'front_delts', name: 'Front delts', group: 'upper_push', weeklyRangeMin: 4, weeklyRangeMax: 12 },
  { id: 'side_delts', name: 'Side delts', group: 'upper_push', weeklyRangeMin: 8, weeklyRangeMax: 20 },
  { id: 'rear_delts', name: 'Rear delts', group: 'upper_pull', weeklyRangeMin: 6, weeklyRangeMax: 16 },
  { id: 'biceps', name: 'Biceps', group: 'arms', weeklyRangeMin: 8, weeklyRangeMax: 18 },
  { id: 'triceps', name: 'Triceps', group: 'arms', weeklyRangeMin: 8, weeklyRangeMax: 18 },
  { id: 'forearms', name: 'Forearms', group: 'arms', weeklyRangeMin: 2, weeklyRangeMax: 10 },
  { id: 'quads', name: 'Quads', group: 'legs', weeklyRangeMin: 8, weeklyRangeMax: 18 },
  { id: 'hamstrings', name: 'Hamstrings', group: 'legs', weeklyRangeMin: 6, weeklyRangeMax: 16 },
  { id: 'glutes', name: 'Glutes', group: 'legs', weeklyRangeMin: 6, weeklyRangeMax: 16 },
  { id: 'adductors', name: 'Adductors', group: 'legs', weeklyRangeMin: 2, weeklyRangeMax: 10 },
  { id: 'calves', name: 'Calves', group: 'legs', weeklyRangeMin: 6, weeklyRangeMax: 16 },
  { id: 'abs', name: 'Abs', group: 'core', weeklyRangeMin: 4, weeklyRangeMax: 16 },
  { id: 'obliques', name: 'Obliques', group: 'core', weeklyRangeMin: 2, weeklyRangeMax: 10 },
  { id: 'spinal_erectors', name: 'Lower back', group: 'core', weeklyRangeMin: 2, weeklyRangeMax: 10 },
  { id: 'neck', name: 'Neck', group: 'core', weeklyRangeMin: 0, weeklyRangeMax: 8 },
];

export const EQUIPMENT_SEED: Equipment[] = [
  { id: 'barbell', name: 'Barbell', category: 'barbell', defaultIncrementKg: 2.5 },
  { id: 'rack', name: 'Squat rack', category: 'barbell', defaultIncrementKg: 2.5 },
  { id: 'bench', name: 'Bench', category: 'specialty', defaultIncrementKg: 2.5 },
  { id: 'dumbbell', name: 'Dumbbells', category: 'dumbbell', defaultIncrementKg: 2.5 },
  { id: 'cable', name: 'Cable station', category: 'cable', defaultIncrementKg: 2.5 },
  { id: 'machine', name: 'Machines', category: 'machine', defaultIncrementKg: 5 },
  { id: 'smith', name: 'Smith machine', category: 'smith', defaultIncrementKg: 2.5 },
  { id: 'pullup_bar', name: 'Pull-up bar', category: 'bodyweight', defaultIncrementKg: 2.5 },
  { id: 'dip_station', name: 'Dip station', category: 'bodyweight', defaultIncrementKg: 2.5 },
  { id: 'band', name: 'Resistance bands', category: 'band', defaultIncrementKg: 1 },
  { id: 'kettlebell', name: 'Kettlebells', category: 'kettlebell', defaultIncrementKg: 4 },
  { id: 'bodyweight', name: 'Bodyweight', category: 'bodyweight', defaultIncrementKg: 1 },
  { id: 'ez_bar', name: 'EZ bar', category: 'barbell', defaultIncrementKg: 2.5 },
  { id: 'trap_bar', name: 'Trap bar', category: 'barbell', defaultIncrementKg: 2.5 },
];
