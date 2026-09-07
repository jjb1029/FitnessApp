import { z } from 'zod';

// Controlled vocabularies shared by the database, the engine, and the UI.
// Stored as text in SQLite and validated with these schemas at the boundary.

export const GoalType = z.enum([
  'build_muscle',
  'lose_fat',
  'recomp',
  'get_stronger',
  'general_fitness',
  'maintain',
  'athletic_performance',
]);
export type GoalType = z.infer<typeof GoalType>;

export const Experience = z.enum(['beginner', 'intermediate', 'advanced']);
export type Experience = z.infer<typeof Experience>;

export const TrainingLocation = z.enum(['gym', 'home', 'both']);
export type TrainingLocation = z.infer<typeof TrainingLocation>;

export const Sex = z.enum(['male', 'female', 'unspecified']);
export type Sex = z.infer<typeof Sex>;

export const WeightUnit = z.enum(['lb', 'kg']);
export type WeightUnit = z.infer<typeof WeightUnit>;

export const LengthUnit = z.enum(['in', 'cm']);
export type LengthUnit = z.infer<typeof LengthUnit>;

export const IntensityScale = z.enum(['rir', 'rpe']);
export type IntensityScale = z.infer<typeof IntensityScale>;

export const ThemePreference = z.enum(['system', 'light', 'dark']);
export type ThemePreference = z.infer<typeof ThemePreference>;

export const MuscleId = z.enum([
  'chest',
  'lats',
  'upper_back',
  'traps',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'calves',
  'abs',
  'obliques',
  'spinal_erectors',
  'neck',
]);
export type MuscleId = z.infer<typeof MuscleId>;

export const MuscleGroup = z.enum(['upper_push', 'upper_pull', 'legs', 'core', 'arms']);
export type MuscleGroup = z.infer<typeof MuscleGroup>;

export const MovementPattern = z.enum([
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
  'knee_extension',
  'knee_flexion',
  'hip_abduction',
  'hip_adduction',
  'elbow_flexion',
  'elbow_extension',
  'shoulder_abduction',
  'shoulder_transverse',
  'calf_raise',
  'trunk_flexion',
  'trunk_rotation',
  'carry',
  'other',
]);
export type MovementPattern = z.infer<typeof MovementPattern>;

export const ExerciseCategory = z.enum(['compound', 'isolation']);
export type ExerciseCategory = z.infer<typeof ExerciseCategory>;

export const Laterality = z.enum(['bilateral', 'unilateral']);
export type Laterality = z.infer<typeof Laterality>;

export const LoadType = z.enum(['external', 'bodyweight', 'bodyweight_plus', 'assisted']);
export type LoadType = z.infer<typeof LoadType>;

export const EquipmentId = z.enum([
  'barbell',
  'rack',
  'bench',
  'dumbbell',
  'cable',
  'machine',
  'smith',
  'pullup_bar',
  'dip_station',
  'band',
  'kettlebell',
  'bodyweight',
  'ez_bar',
  'trap_bar',
]);
export type EquipmentId = z.infer<typeof EquipmentId>;

export const EquipmentCategory = z.enum([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'kettlebell',
  'smith',
  'specialty',
]);
export type EquipmentCategory = z.infer<typeof EquipmentCategory>;

export const Split = z.enum([
  'full_body',
  'upper_lower',
  'ppl',
  'upper_lower_arms',
  'body_part',
  'custom',
]);
export type Split = z.infer<typeof Split>;

export const SchedulingMode = z.enum(['sequential', 'weekday']);
export type SchedulingMode = z.infer<typeof SchedulingMode>;

export const ProgressionScheme = z.enum([
  'double_progression',
  'linear_load',
  'rep_progression',
  'custom',
]);
export type ProgressionScheme = z.infer<typeof ProgressionScheme>;

export const SetType = z.enum(['working', 'warmup', 'backoff', 'drop']);
export type SetType = z.infer<typeof SetType>;

export const SessionStatus = z.enum(['in_progress', 'completed', 'abandoned']);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const SkipReason = z.enum(['no_time', 'equipment_busy', 'not_feeling_it', 'discomfort']);
export type SkipReason = z.infer<typeof SkipReason>;

export const SwapReason = z.enum([
  'equipment',
  'dislike',
  'discomfort',
  'too_hard',
  'too_easy',
  'variety',
]);
export type SwapReason = z.infer<typeof SwapReason>;

export const PreferenceSentiment = z.enum(['like', 'dislike', 'avoid']);
export type PreferenceSentiment = z.infer<typeof PreferenceSentiment>;

export const RecommendationType = z.enum([
  'load_target',
  'rep_target',
  'add_set',
  'remove_set',
  'swap_exercise',
  'deload',
  'reduce_volume',
  'increase_volume',
  'change_program',
  'restart_program',
  'calorie_adjust',
  'compress_session',
  'info',
]);
export type RecommendationType = z.infer<typeof RecommendationType>;

export const RecommendationStatus = z.enum([
  'pending',
  'applied',
  'dismissed',
  'expired',
  'superseded',
]);
export type RecommendationStatus = z.infer<typeof RecommendationStatus>;

export const RecommendationSource = z.enum(['engine', 'coach']);
export type RecommendationSource = z.infer<typeof RecommendationSource>;

export const Confidence = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof Confidence>;

export const MeasurementSite = z.enum([
  'waist',
  'chest',
  'hips',
  'left_arm',
  'right_arm',
  'left_thigh',
  'right_thigh',
  'neck',
  'shoulders',
  'calf',
]);
export type MeasurementSite = z.infer<typeof MeasurementSite>;

export const PhotoPose = z.enum(['front', 'side', 'back']);
export type PhotoPose = z.infer<typeof PhotoPose>;

export const DataSource = z.enum(['manual', 'apple_health', 'health_connect', 'import']);
export type DataSource = z.infer<typeof DataSource>;
