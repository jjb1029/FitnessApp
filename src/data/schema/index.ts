import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type {
  DataSource,
  EquipmentId,
  ExerciseInstructions,
  ExerciseMuscle,
  Explanation,
  GoalType,
  MeasurementSite,
  MovementPattern,
  MuscleId,
  PhotoPose,
  PreferenceSentiment,
  RecommendationPayload,
  RecommendationScope,
  RepRange,
  SchedulingMode,
  SessionModifications,
  SessionSummary,
  SwapReason,
  TargetSnapshot,
  UserSettings,
} from '@/domain';

/**
 * Drizzle schema for Phase 1 (docs/04). Every user-owned table carries the
 * sync columns from day one so Phase 2 sync is a bolt-on. JSON columns are
 * typed at the boundary via `$type`.
 */

const syncColumns = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  version: integer('version').notNull().default(1),
};

// ---------- Reference data ----------

export const muscles = sqliteTable('muscle', {
  id: text('id').$type<MuscleId>().primaryKey(),
  name: text('name').notNull(),
  group: text('group').notNull(),
  weeklyRangeMin: integer('weekly_range_min').notNull(),
  weeklyRangeMax: integer('weekly_range_max').notNull(),
});

export const equipment = sqliteTable('equipment', {
  id: text('id').$type<EquipmentId>().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  defaultIncrementKg: real('default_increment_kg').notNull(),
});

export const exercises = sqliteTable(
  'exercise',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull(),
    movementPattern: text('movement_pattern').$type<MovementPattern>().notNull(),
    category: text('category').notNull(),
    equipmentIds: text('equipment_ids', { mode: 'json' }).$type<EquipmentId[]>().notNull(),
    laterality: text('laterality').notNull(),
    loadType: text('load_type').notNull(),
    stability: integer('stability').notNull(),
    difficulty: integer('difficulty').notNull(),
    fatigueCost: integer('fatigue_cost').notNull(),
    repRangeDefault: text('rep_range_default', { mode: 'json' }).$type<RepRange>().notNull(),
    repRangeAllowed: text('rep_range_allowed', { mode: 'json' }).$type<RepRange>().notNull(),
    incrementKg: real('increment_kg').notNull(),
    muscles: text('muscles', { mode: 'json' }).$type<ExerciseMuscle[]>().notNull(),
    instructions: text('instructions', { mode: 'json' }).$type<ExerciseInstructions>().notNull(),
    progressionNotes: text('progression_notes'),
    regressionIds: text('regression_ids', { mode: 'json' }).$type<string[]>().notNull(),
    alternativeIds: text('alternative_ids', { mode: 'json' }).$type<string[]>().notNull(),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    createdByUserId: text('created_by_user_id'),
    catalogVersion: integer('catalog_version').notNull().default(0),
    ...syncColumns,
  },
  (t) => [index('exercise_pattern_idx').on(t.movementPattern), index('exercise_name_idx').on(t.name)],
);

export const programTemplates = sqliteTable('program_template', {
  id: text('id').primaryKey(),
  /** Full ProgramTemplate JSON; immutable catalog content. */
  data: text('data', { mode: 'json' }).notNull(),
  catalogVersion: integer('catalog_version').notNull().default(1),
});

export const catalogMeta = sqliteTable('catalog_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ---------- User ----------

export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  authUserId: text('auth_user_id'),
  settings: text('settings', { mode: 'json' }).$type<UserSettings>().notNull(),
  onboardingCompletedAt: text('onboarding_completed_at'),
  ...syncColumns,
});

export const profiles = sqliteTable('profile', {
  userId: text('user_id').primaryKey().references(() => users.id),
  birthYear: integer('birth_year'),
  sex: text('sex').notNull().default('unspecified'),
  heightCm: real('height_cm'),
  trainingExperience: text('training_experience').notNull(),
  daysPerWeek: integer('days_per_week').notNull(),
  sessionMinutes: integer('session_minutes').notNull(),
  trainingLocation: text('training_location').notNull(),
  limitations: text('limitations', { mode: 'json' }).$type<string[]>().notNull(),
  ...syncColumns,
});

export const goals = sqliteTable(
  'goal',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    type: text('type').$type<GoalType>().notNull(),
    isCurrent: integer('is_current', { mode: 'boolean' }).notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    ...syncColumns,
  },
  (t) => [index('goal_user_current_idx').on(t.userId, t.isCurrent)],
);

export const equipmentAccess = sqliteTable(
  'equipment_access',
  {
    userId: text('user_id').notNull().references(() => users.id),
    equipmentId: text('equipment_id').$type<EquipmentId>().notNull(),
    location: text('location').notNull(),
    available: integer('available', { mode: 'boolean' }).notNull(),
    ...syncColumns,
  },
  (t) => [primaryKey({ columns: [t.userId, t.equipmentId, t.location] })],
);

export const exercisePreferences = sqliteTable(
  'exercise_preference',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    exerciseId: text('exercise_id').notNull(),
    sentiment: text('sentiment').$type<PreferenceSentiment>().notNull(),
    reason: text('reason').$type<SwapReason>(),
    note: text('note'),
    ...syncColumns,
  },
  (t) => [index('exercise_preference_user_idx').on(t.userId, t.exerciseId)],
);

// ---------- Programs ----------

export const programs = sqliteTable(
  'program',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    templateId: text('template_id'),
    split: text('split').notNull(),
    daysPerWeek: integer('days_per_week').notNull(),
    goalType: text('goal_type').$type<GoalType>().notNull(),
    description: text('description').notNull().default(''),
    rationale: text('rationale').notNull().default(''),
    explanation: text('explanation', { mode: 'json' }).$type<Explanation>(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    startedAt: text('started_at'),
    schedulingMode: text('scheduling_mode').$type<SchedulingMode>().notNull().default('sequential'),
    weekdayMap: text('weekday_map', { mode: 'json' }).$type<Record<string, number>>(),
    nextDayIndex: integer('next_day_index').notNull().default(0),
    deloadEveryWeeks: integer('deload_every_weeks'),
    ...syncColumns,
  },
  (t) => [index('program_user_active_idx').on(t.userId, t.isActive)],
);

export const programDays = sqliteTable(
  'program_day',
  {
    id: text('id').primaryKey(),
    programId: text('program_id').notNull().references(() => programs.id),
    order: integer('order').notNull(),
    name: text('name').notNull(),
    focusMuscleIds: text('focus_muscle_ids', { mode: 'json' }).$type<MuscleId[]>().notNull(),
    estimatedMinutes: integer('estimated_minutes').notNull(),
    isRest: integer('is_rest', { mode: 'boolean' }).notNull().default(false),
    ...syncColumns,
  },
  (t) => [index('program_day_program_idx').on(t.programId, t.order)],
);

export const templateExercises = sqliteTable(
  'template_exercise',
  {
    id: text('id').primaryKey(),
    programDayId: text('program_day_id').notNull().references(() => programDays.id),
    order: integer('order').notNull(),
    exerciseId: text('exercise_id').notNull(),
    priority: integer('priority').notNull().default(2),
    repRange: text('rep_range', { mode: 'json' }).$type<RepRange>().notNull(),
    targetRir: real('target_rir').notNull(),
    restSeconds: integer('rest_seconds').notNull(),
    progressionScheme: text('progression_scheme').notNull().default('double_progression'),
    workingSets: integer('working_sets').notNull(),
    notes: text('notes'),
    supersetGroup: text('superset_group'),
    ...syncColumns,
  },
  (t) => [index('template_exercise_day_idx').on(t.programDayId, t.order)],
);

// ---------- Sessions ----------

export const sessions = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    programId: text('program_id'),
    programDayId: text('program_day_id'),
    name: text('name').notNull(),
    status: text('status').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    localDate: text('local_date').notNull(),
    outOfSequence: integer('out_of_sequence', { mode: 'boolean' }).notNull().default(false),
    modifications: text('modifications', { mode: 'json' }).$type<SessionModifications>().notNull(),
    notes: text('notes'),
    summary: text('summary', { mode: 'json' }).$type<SessionSummary>(),
    ...syncColumns,
  },
  (t) => [index('session_user_date_idx').on(t.userId, t.localDate), index('session_status_idx').on(t.userId, t.status)],
);

export const sessionExercises = sqliteTable(
  'session_exercise',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => sessions.id),
    order: integer('order').notNull(),
    exerciseId: text('exercise_id').notNull(),
    templateExerciseId: text('template_exercise_id'),
    substitutedFromExerciseId: text('substituted_from_exercise_id'),
    substitutionReason: text('substitution_reason').$type<SwapReason>(),
    targetSnapshot: text('target_snapshot', { mode: 'json' }).$type<TargetSnapshot>().notNull(),
    skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
    skipReason: text('skip_reason'),
    restSecondsOverride: integer('rest_seconds_override'),
    notes: text('notes'),
    ...syncColumns,
  },
  (t) => [index('session_exercise_session_idx').on(t.sessionId, t.order), index('session_exercise_exercise_idx').on(t.exerciseId)],
);

export const performedSets = sqliteTable(
  'performed_set',
  {
    id: text('id').primaryKey(),
    sessionExerciseId: text('session_exercise_id').notNull().references(() => sessionExercises.id),
    order: integer('order').notNull(),
    setType: text('set_type').notNull().default('working'),
    loadKg: real('load_kg'),
    enteredLoad: real('entered_load'),
    enteredUnit: text('entered_unit'),
    addedLoadKg: real('added_load_kg'),
    reps: integer('reps').notNull(),
    rir: real('rir'),
    completedAt: text('completed_at').notNull(),
    suggestedLoadKg: real('suggested_load_kg'),
    suggestedReps: integer('suggested_reps'),
    e1rmKg: real('e1rm_kg'),
    e1rmFormula: text('e1rm_formula'),
    isPr: integer('is_pr', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    ...syncColumns,
  },
  (t) => [index('performed_set_exercise_idx').on(t.sessionExerciseId, t.order)],
);

// ---------- Body ----------

export const bodyweightEntries = sqliteTable(
  'bodyweight_entry',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    weightKg: real('weight_kg').notNull(),
    measuredAt: text('measured_at').notNull(),
    localDate: text('local_date').notNull(),
    source: text('source').$type<DataSource>().notNull().default('manual'),
    externalId: text('external_id'),
    ...syncColumns,
  },
  (t) => [index('bodyweight_user_date_idx').on(t.userId, t.localDate)],
);

export const measurements = sqliteTable(
  'measurement',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    site: text('site').$type<MeasurementSite>().notNull(),
    valueCm: real('value_cm').notNull(),
    measuredAt: text('measured_at').notNull(),
    localDate: text('local_date').notNull(),
    ...syncColumns,
  },
  (t) => [index('measurement_user_site_idx').on(t.userId, t.site, t.localDate)],
);

export const progressPhotos = sqliteTable(
  'progress_photo',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    takenAt: text('taken_at').notNull(),
    localDate: text('local_date').notNull(),
    pose: text('pose').$type<PhotoPose>().notNull(),
    fileUri: text('file_uri').notNull(),
    bodyweightEntryId: text('bodyweight_entry_id'),
    ...syncColumns,
  },
  (t) => [index('photo_user_date_idx').on(t.userId, t.localDate)],
);

// ---------- Intelligence ----------

export const recommendations = sqliteTable(
  'recommendation',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    type: text('type').notNull(),
    scope: text('scope', { mode: 'json' }).$type<RecommendationScope>().notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    explanation: text('explanation', { mode: 'json' }).$type<Explanation>().notNull(),
    payload: text('payload', { mode: 'json' }).$type<RecommendationPayload>().notNull(),
    source: text('source').notNull().default('engine'),
    confidence: text('confidence').notNull(),
    priority: integer('priority').notNull().default(0),
    status: text('status').notNull().default('pending'),
    resolvedAt: text('resolved_at'),
    expiresAt: text('expires_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('recommendation_user_status_idx').on(t.userId, t.status), uniqueIndex('recommendation_id_idx').on(t.id)],
);

export type ExerciseRow = typeof exercises.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type GoalRow = typeof goals.$inferSelect;
export type ProgramRow = typeof programs.$inferSelect;
export type ProgramDayRow = typeof programDays.$inferSelect;
export type TemplateExerciseRow = typeof templateExercises.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type SessionExerciseRow = typeof sessionExercises.$inferSelect;
export type PerformedSetRow = typeof performedSets.$inferSelect;
export type BodyweightEntryRow = typeof bodyweightEntries.$inferSelect;
export type RecommendationRow = typeof recommendations.$inferSelect;
