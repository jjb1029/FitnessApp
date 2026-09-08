/**
 * Every rule the engine can fire, with its hand-written Tier 1 template and
 * Tier 2 description (docs/12, docs/13 §11). A rule without a template does
 * not exist: `buildExplanation` refuses unknown ids and a test enumerates
 * this registry to enforce the length limit.
 */

export type RuleVars = Record<string, string | number>;

export type RuleDefinition = {
  /** Plain-language rule name shown at Tier 2. */
  name: string;
  /** One-paragraph description shown at Tier 2. */
  description: string;
  /** Tier 1 template; variables in braces. Two sentences at most. */
  tier1: string;
  /** Example variables used by the registry test to render and measure the template. */
  sample: RuleVars;
  /** Knowledge items that explain this rule (Tier 3). Resolved lazily. */
  knowledgeItemIds: string[];
};

export const RULES = {
  // ---------------- Progression ----------------
  'progression.seed': {
    name: 'Starting load',
    description: 'With no history for this exercise, the first load is a conservative estimate. The engine adjusts from the first logged session, so the starting number matters less than logging honestly.',
    tier1: 'A conservative starting load. I will adjust it from your first session.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.starting-loads'],
  },
  'progression.double.increase_load': {
    name: 'Double progression: add weight',
    description: 'Add reps inside the target range at a fixed weight. Once every working set reaches the top of the range with reps in reserve, add one increment and start again at the bottom of the range.',
    tier1: 'You reached the top of your rep range last time with reps to spare, so a small increase is due.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.increase_load_large': {
    name: 'Double progression: larger jump',
    description: 'When every set hits the top of the range with two or more reps in reserve beyond the target, the increase is doubled for barbell movements because the load is clearly light.',
    tier1: 'All sets hit the top of the range with {rir} reps in reserve, so I added a bit more than usual.',
    sample: { rir: 4 },
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.add_rep': {
    name: 'Double progression: add a rep',
    description: 'Inside the rep range the weight stays the same and the target is one more rep on the first set. Reps are the progression until the top of the range is reached.',
    tier1: 'You are inside your rep range. Add a rep before adding weight.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.consolidate': {
    name: 'Consolidate before adding weight',
    description: 'Reaching the top of the range with no reps in reserve means the weight is not yet comfortable. Repeating it once builds the margin that makes the next increase stick.',
    tier1: 'You hit the top of the range but with nothing left, so we will repeat it before adding weight.',
    sample: {},
    knowledgeItemIds: ['rir-rpe.why-rir'],
  },
  'progression.hold_after_miss': {
    name: 'Hold after a missed target',
    description: 'A session below the bottom of the rep range is treated as a signal, not a failure. The weight stays the same and the target returns to the bottom of the range.',
    tier1: 'Last session came in under the range. Same weight today, aiming for the bottom of the range.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.missed-sessions'],
  },
  'progression.reduce_load': {
    name: 'Reduce load after two misses',
    description: 'Two consecutive sessions under the rep range usually mean the load ran ahead of recovery. Easing it by five to ten percent restores progress faster than grinding.',
    tier1: 'Two tough sessions in a row. Easing the weight to get you progressing again.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.missed-sessions', 'fatigue.signals'],
  },
  'progression.linear.increase_load': {
    name: 'Linear progression',
    description: 'Newer lifters can add weight every session on the main movements. The engine keeps doing this until two sessions miss the target, then switches to adding reps first.',
    tier1: 'You hit every rep last time. While that keeps working, we add weight each session.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.linear-progression'],
  },
  'progression.linear.to_double': {
    name: 'Switch from linear to double progression',
    description: 'Adding weight every session stops working for everyone eventually. After two misses the exercise moves to double progression, where reps are added before weight.',
    tier1: 'Two sessions under target, so we will switch this lift to adding reps before weight.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.linear-progression', 'progressive-overload.double-progression'],
  },
  'progression.layoff': {
    name: 'Ease back after time off',
    description: 'After two or more weeks away from an exercise, loads are reduced (ten percent after two weeks, twenty after four) so the first session back rebuilds the groove without excessive soreness.',
    tier1: '{days} days since this lift. Starting {percent}% lighter so you can build back safely.',
    sample: { days: 16, percent: 10 },
    knowledgeItemIds: ['progressive-overload.layoffs'],
  },
  'progression.bodyweight.add_load': {
    name: 'Bodyweight movement: add load',
    description: 'For bodyweight exercises, reps progress first. Once the top of the range is reached at bodyweight, external load is added and the range restarts at the bottom.',
    tier1: 'You reached the top of the range at bodyweight, so it is time to add a little weight.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.bodyweight-movements'],
  },
  'progression.bodyweight.regress': {
    name: 'Bodyweight movement: use an easier variation',
    description: 'If the bottom of the rep range cannot be reached at bodyweight, an easier variation or assistance gives enough reps to progress.',
    tier1: 'Below the range at bodyweight, so an easier variation will build reps faster.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.bodyweight-movements'],
  },
  'progression.assisted.reduce': {
    name: 'Assisted movement: reduce assistance',
    description: 'Assisted exercises progress by reducing the help, which is the equivalent of adding weight.',
    tier1: 'You reached the top of the range, so the assistance comes down a step.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.bodyweight-movements'],
  },
  'progression.calibrate': {
    name: 'Calibrate increments to your overrides',
    description: 'When the user overrides the suggested load in the same direction three sessions in a row, the engine adjusts the increment for that exercise and says so once.',
    tier1: 'You have gone up faster than I suggested three times, so I increased the jumps.',
    sample: {},
    knowledgeItemIds: [],
  },
  'progression.reps_only': {
    name: 'Reps decide when RIR is not logged',
    description: 'Without reps-in-reserve data the engine progresses on reps alone: reach the top of the range on every set and the weight goes up.',
    tier1: 'Based on your reps: reach the top of the range on every set and the weight goes up.',
    sample: {},
    knowledgeItemIds: ['rir-rpe.why-rir'],
  },
  'progression.double.increase_load_reps': {
    name: 'Double progression: add weight (reps only)',
    description: 'Every working set reached the top of the rep range. Without RIR data the engine treats that as ready for more weight and restarts at the bottom of the range.',
    tier1: 'Every set reached the top of your rep range, so the weight goes up.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.hold_reps': {
    name: 'Double progression: repeat before adding a rep',
    description: 'Inside the range but at or near failure, the same reps are repeated once so the next rep comes with margin.',
    tier1: 'You are inside the range but close to your limit. Repeat it, then add a rep.',
    sample: {},
    knowledgeItemIds: ['rir-rpe.why-rir'],
  },
  'progression.same_day': {
    name: 'Second session of the day',
    description: 'When an exercise was already trained today, targets repeat rather than progress, so a double session does not double-count.',
    tier1: 'You already trained this today, so the targets stay the same.',
    sample: {},
    knowledgeItemIds: ['frequency.consistency'],
  },
  'pr.e1rm': {
    name: 'Estimated one-rep max record',
    description: 'A set whose estimated one-rep max (Epley: load × (1 + reps ÷ 30), reps of 12 or fewer) beats every previous working set for this exercise.',
    tier1: 'Your best estimated one-rep max on this exercise, up {delta} on the previous best.',
    sample: { delta: '4 lb' },
    knowledgeItemIds: ['strength.estimated-1rm'],
  },
  'pr.load': {
    name: 'Heaviest load record',
    description: 'The heaviest working-set load ever logged for this exercise.',
    tier1: 'The most weight you have lifted on this exercise.',
    sample: {},
    knowledgeItemIds: ['strength.estimated-1rm'],
  },

  // ---------------- Substitution ----------------
  'substitution.rank': {
    name: 'Substitution ranking',
    description: 'Alternatives are ranked by shared primary muscles, movement pattern, secondary muscles, rep-range fit, and the reason for the swap, then filtered by available equipment. The score is a similarity, not a measurement.',
    tier1: 'Same movement pattern and the same muscles, using equipment you have.',
    sample: {},
    knowledgeItemIds: ['substitution.preserving-stimulus'],
  },
  'substitution.discomfort': {
    name: 'Substitution for discomfort',
    description: 'For discomfort the ranking prefers more stable, less technical variations. Pain rather than discomfort is a reason to speak with a professional.',
    tier1: 'A more stable variation that works the same muscles with less strain on the joint.',
    sample: {},
    knowledgeItemIds: ['substitution.preserving-stimulus', 'safety.pain-vs-discomfort'],
  },

  // ---------------- Warm-ups ----------------
  'warmup.suggest': {
    name: 'Warm-up sets',
    description: 'Primary compound movements get two or three lighter sets that build to the working load without adding fatigue. Warm-ups are excluded from progression and volume.',
    tier1: '{count} lighter sets to get to {load} without tiring you out.',
    sample: { count: 'Two', load: '185 lb' },
    knowledgeItemIds: ['exercise-selection.warm-ups'],
  },

  // ---------------- Scheduling ----------------
  'schedule.sequential.next': {
    name: 'Sequential scheduling',
    description: 'The program runs in order. Today is always the next day not yet completed, whatever the weekday, so a missed day simply moves to the next opportunity.',
    tier1: 'This is the next day in your program. Missed days just move on to the next one.',
    sample: {},
    knowledgeItemIds: ['frequency.consistency'],
  },
  'schedule.weekday.rest': {
    name: 'Weekday scheduling: rest day',
    description: 'With days pinned to weekdays, a day with nothing mapped is a rest day. The next unfinished day can still be trained.',
    tier1: 'Nothing is planned for today. Rest, or do the next day anyway.',
    sample: {},
    knowledgeItemIds: ['recovery.rest-days'],
  },
  'schedule.welcome_back': {
    name: 'Welcome back after a layoff',
    description: 'After five or more days away, the day is the next in sequence and loads pass through the layoff rule so the first session back is comfortable.',
    tier1: '{days} days off, so loads today are eased by {percent}% to settle back in.',
    sample: { days: 9, percent: 10 },
    knowledgeItemIds: ['progressive-overload.layoffs'],
  },
  'schedule.restart_suggested': {
    name: 'Restart suggested after a long break',
    description: 'After four weeks away, restarting the program from day one rebuilds tolerance in order rather than resuming mid-week at reduced loads.',
    tier1: 'It has been {days} days. Restarting from day one will rebuild your base in order.',
    sample: { days: 31 },
    knowledgeItemIds: ['progressive-overload.layoffs'],
  },

  // ---------------- Program selection ----------------
  'program.select': {
    name: 'Program recommendation',
    description: 'The template is chosen from training days, experience, and goal. Session length trims accessories, and unavailable equipment is swapped exercise by exercise.',
    tier1: 'Fits {days} days a week and trains each muscle twice weekly, a good balance of work and recovery.',
    sample: { days: 4 },
    knowledgeItemIds: ['frequency.per-muscle-frequency', 'volume.weekly-set-ranges'],
  },
  'program.select.beginner': {
    name: 'Beginner program recommendation',
    description: 'New lifters progress fastest on simple full-body sessions with weight added each session while it keeps working.',
    tier1: 'Three simple full-body sessions so you learn the main lifts and add weight every session.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.linear-progression'],
  },
  'program.select.alternative': {
    name: 'Why another program ranked lower',
    description: 'Other templates were considered and ranked by fit to days, experience, and goal.',
    tier1: 'Also a good fit, but {reason}.',
    sample: { reason: 'it needs two more training days than you have' },
    knowledgeItemIds: [],
  },
  'program.equipment_swap': {
    name: 'Equipment-based swap in the program',
    description: 'An exercise in the template needs equipment that is not available, so the closest match with available equipment replaced it.',
    tier1: '{from} needs equipment you do not have, so {to} takes its place.',
    sample: { from: 'Barbell bench press', to: 'Dumbbell bench press' },
    knowledgeItemIds: ['substitution.preserving-stimulus'],
  },
  'program.preference_swap': {
    name: 'Preference-based swap in the program',
    description: 'An exercise the user asked to avoid was replaced with the closest match.',
    tier1: 'You asked to avoid {from}, so {to} takes its place.',
    sample: { from: 'Barbell back squat', to: 'Hack squat' },
    knowledgeItemIds: ['substitution.preserving-stimulus'],
  },
} as const satisfies Record<string, RuleDefinition>;

export type RuleId = keyof typeof RULES;

export function isRuleId(value: string): value is RuleId {
  return Object.prototype.hasOwnProperty.call(RULES, value);
}
