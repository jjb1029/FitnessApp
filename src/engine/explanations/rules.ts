/**
 * Every rule the engine can fire, with its hand-written Tier 1 template and
 * Tier 2 description (docs/12, docs/13 §11, docs/14 §2). A rule without a
 * template does not exist: `buildExplanation` refuses unknown ids and a test
 * enumerates this registry to enforce the length limit.
 *
 * Voice: Forma speaks in the first person about its decisions and in the
 * second person about the user's effort. Short declaratives, periods, no
 * exclamation marks.
 */

export type RuleVars = Record<string, string | number>;

export type RuleDefinition = {
  /** Plain-language rule name shown at Tier 2 under "How I decide". */
  name: string;
  /** One-paragraph description shown at Tier 2, written as Forma explaining its thinking. */
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
    description: 'I have no history for this exercise yet, so the first weight is your call. A conservative start is the right start: I adjust from your first logged session, so the exact number matters less than logging honestly.',
    tier1: 'A conservative starting load. I will adjust it from your first session.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.starting-loads'],
  },
  'progression.double.increase_load': {
    name: 'Add weight',
    description: 'I add weight when every working set reaches the top of your rep range with reps to spare, then start you back at the bottom of the range. Reps first, then weight, then reps again.',
    tier1: 'You reached the top of your rep range last time with reps to spare, so a small increase is due.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.increase_load_large': {
    name: 'Add more weight than usual',
    description: 'When every set hits the top of the range with two or more reps in reserve beyond the target, the weight was clearly light. On barbell lifts I take a bigger step so you are not spending sessions on easy work.',
    tier1: 'All sets hit the top of the range with {rir} reps in reserve, so I added a bit more than usual.',
    sample: { rir: 4 },
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.increase_load_reps': {
    name: 'Add weight, reps only',
    description: 'Every working set reached the top of the rep range. Without effort data I treat that as ready for more weight and start you back at the bottom of the range.',
    tier1: 'Every set reached the top of your rep range, so the weight goes up.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.add_rep': {
    name: 'Add a rep',
    description: 'Inside the rep range I keep the weight and ask for one more rep on the first set. Reps are the progression until you reach the top of the range.',
    tier1: 'You are inside your rep range. Add a rep before adding weight.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.double-progression'],
  },
  'progression.double.consolidate': {
    name: 'Repeat before adding weight',
    description: 'You reached the top of the range with nothing left. I repeat it once so the next increase comes with margin instead of a grind.',
    tier1: 'You hit the top of the range but with nothing left, so we will repeat it before adding weight.',
    sample: {},
    knowledgeItemIds: ['rir-rpe.why-rir'],
  },
  'progression.double.hold_reps': {
    name: 'Repeat before adding a rep',
    description: 'You are inside the range but at or near your limit. I ask for the same reps once more so the next rep comes with room to spare.',
    tier1: 'You are inside the range but close to your limit. Repeat it, then add a rep.',
    sample: {},
    knowledgeItemIds: ['rir-rpe.why-rir'],
  },
  'progression.hold_after_miss': {
    name: 'Hold after a tough session',
    description: 'A session under the bottom of the range is information, not a failure. I keep the weight the same and aim for the bottom of the range so you can rebuild from there.',
    tier1: 'Last session came in under the range. Same weight today, aiming for the bottom of the range.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.missed-sessions'],
  },
  'progression.reduce_load': {
    name: 'Ease the weight',
    description: 'Two sessions in a row under the range usually means the weight ran ahead of recovery. I ease it by five to ten percent, which gets you progressing again faster than grinding would.',
    tier1: 'Two tough sessions in a row. Easing the weight to get you progressing again.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.missed-sessions', 'fatigue.signals'],
  },
  'progression.linear.increase_load': {
    name: 'Add weight every session',
    description: 'While you are newer to lifting, the main movements can go up every session. I keep adding weight until two sessions miss the target, then switch to adding reps first.',
    tier1: 'You hit every rep last time. While that keeps working, we add weight each session.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.linear-progression'],
  },
  'progression.linear.to_double': {
    name: 'Switch to reps first',
    description: 'Adding weight every session stops working for everyone eventually. After two misses I move this lift to adding reps before weight, which progresses more steadily from here.',
    tier1: 'Two sessions under target, so we will switch this lift to adding reps before weight.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.linear-progression', 'progressive-overload.double-progression'],
  },
  'progression.layoff': {
    name: 'Ease back after time off',
    description: 'After two or more weeks away from an exercise I reduce the weight, ten percent after two weeks and twenty after four, so the first session back rebuilds the groove without days of soreness.',
    tier1: '{days} days since this lift. Starting {percent}% lighter so you can build back safely.',
    sample: { days: 16, percent: 10 },
    knowledgeItemIds: ['progressive-overload.layoffs'],
  },
  'progression.bodyweight.add_load': {
    name: 'Add weight to a bodyweight movement',
    description: 'On bodyweight exercises reps come first. Once you reach the top of the range at bodyweight I add external load and start the range again at the bottom.',
    tier1: 'You reached the top of the range at bodyweight, so it is time to add a little weight.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.bodyweight-movements'],
  },
  'progression.bodyweight.regress': {
    name: 'Use an easier variation',
    description: 'If the bottom of the rep range is out of reach at bodyweight, an easier variation or some assistance gives you enough reps to progress from.',
    tier1: 'Below the range at bodyweight, so an easier variation will build reps faster.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.bodyweight-movements'],
  },
  'progression.assisted.reduce': {
    name: 'Reduce the assistance',
    description: 'Assisted exercises progress by reducing the help, which is the same as adding weight.',
    tier1: 'You reached the top of the range, so the assistance comes down a step.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.bodyweight-movements'],
  },
  'progression.calibrate': {
    name: 'Match your jumps',
    description: 'When you override my suggestion in the same direction three sessions running, I take the hint and adjust the size of the jumps for this exercise.',
    tier1: 'You have gone up faster than I suggested three times, so I increased the jumps.',
    sample: {},
    knowledgeItemIds: [],
  },
  'progression.reps_only': {
    name: 'Reps decide',
    description: 'Without effort data I progress on reps alone: reach the top of the range on every set and the weight goes up.',
    tier1: 'Based on your reps: reach the top of the range on every set and the weight goes up.',
    sample: {},
    knowledgeItemIds: ['rir-rpe.why-rir'],
  },
  'progression.same_day': {
    name: 'Second session today',
    description: 'You already trained this today, so I keep the targets the same rather than progressing twice in one day.',
    tier1: 'You already trained this today, so the targets stay the same.',
    sample: {},
    knowledgeItemIds: ['frequency.consistency'],
  },
  'pr.e1rm': {
    name: 'Estimated max record',
    description: 'I estimate a one-rep max from load and reps (Epley, for twelve reps or fewer). This set beat every previous working set on this exercise.',
    tier1: 'Your best estimated one-rep max on this exercise, up {delta} on the previous best.',
    sample: { delta: '4 lb' },
    knowledgeItemIds: ['strength.estimated-1rm'],
  },
  'pr.load': {
    name: 'Heaviest load record',
    description: 'The heaviest working-set load you have ever logged for this exercise.',
    tier1: 'The most weight you have lifted on this exercise.',
    sample: {},
    knowledgeItemIds: ['strength.estimated-1rm'],
  },

  // ---------------- Substitution ----------------
  'substitution.rank': {
    name: 'Ranking alternatives',
    description: 'I rank alternatives by how well they share the primary muscles, the movement pattern, the secondary muscles, and the rep range, then by the reason you gave, and I only show what your equipment allows. The percentage is a similarity, not a measurement.',
    tier1: 'Same movement pattern and the same muscles, using equipment you have.',
    sample: {},
    knowledgeItemIds: ['substitution.preserving-stimulus'],
  },
  'substitution.discomfort': {
    name: 'Ranking for discomfort',
    description: 'For discomfort I prefer more stable, less technical variations that work the same muscles. Pain rather than discomfort is a reason to speak with a professional.',
    tier1: 'A more stable variation that works the same muscles with less strain on the joint.',
    sample: {},
    knowledgeItemIds: ['substitution.preserving-stimulus', 'safety.pain-vs-discomfort'],
  },

  // ---------------- Warm-ups ----------------
  'warmup.suggest': {
    name: 'Warm-up sets',
    description: 'Before a primary compound movement I suggest two or three lighter sets that build to the working weight without adding fatigue. Warm-ups never count toward progression or volume.',
    tier1: '{count} lighter sets to get to {load} without tiring you out.',
    sample: { count: 'Two', load: '185 lb' },
    knowledgeItemIds: ['exercise-selection.warm-ups'],
  },

  // ---------------- Scheduling ----------------
  'schedule.sequential.next': {
    name: 'Next day in order',
    description: 'Your program runs in order. Today is always the next day you have not done, whatever the weekday, so a missed day simply moves to the next time you train.',
    tier1: 'This is the next day in your program. Missed days just move on to the next one.',
    sample: {},
    knowledgeItemIds: ['frequency.consistency'],
  },
  'schedule.weekday.rest': {
    name: 'Rest day',
    description: 'Your days are pinned to weekdays and nothing is planned today. The next unfinished day is available if you want to train anyway.',
    tier1: 'Nothing is planned for today. Rest, or do the next day anyway.',
    sample: {},
    knowledgeItemIds: ['recovery.rest-days'],
  },
  'schedule.welcome_back': {
    name: 'Welcome back',
    description: 'After five or more days away I keep the next day in sequence and ease its loads so the first session back feels comfortable rather than punishing.',
    tier1: '{days} days off, so loads today are eased by {percent}% to settle back in.',
    sample: { days: 9, percent: 10 },
    knowledgeItemIds: ['progressive-overload.layoffs'],
  },
  'schedule.restart_suggested': {
    name: 'Restart the program',
    description: 'After four weeks away, restarting from day one rebuilds tolerance in order rather than dropping you into the middle of a week at reduced loads.',
    tier1: 'It has been {days} days. Restarting from day one will rebuild your base in order.',
    sample: { days: 31 },
    knowledgeItemIds: ['progressive-overload.layoffs'],
  },

  // ---------------- Program selection ----------------
  'program.select': {
    name: 'Choosing your program',
    description: 'I choose the template from your training days, experience, and goal. Session length trims accessories, and anything that needs equipment you do not have is swapped exercise by exercise.',
    tier1: 'Fits {days} days a week and trains each muscle twice weekly, a good balance of work and recovery.',
    sample: { days: 4 },
    knowledgeItemIds: ['frequency.per-muscle-frequency', 'volume.weekly-set-ranges'],
  },
  'program.select.beginner': {
    name: 'Choosing a first program',
    description: 'New lifters progress fastest on simple full-body sessions with weight added every session while that keeps working.',
    tier1: 'Three simple full-body sessions so you learn the main lifts and add weight every session.',
    sample: {},
    knowledgeItemIds: ['progressive-overload.linear-progression'],
  },
  'program.select.alternative': {
    name: 'Why another program ranked lower',
    description: 'I considered the other templates too and ranked them by fit to your days, experience, and goal.',
    tier1: 'Also a good fit, but {reason}.',
    sample: { reason: 'it needs two more training days than you have' },
    knowledgeItemIds: [],
  },
  'program.equipment_swap': {
    name: 'Swapped for equipment',
    description: 'An exercise in the template needs equipment you do not have, so I put the closest match with your equipment in its place.',
    tier1: '{from} needs equipment you do not have, so {to} takes its place.',
    sample: { from: 'Barbell bench press', to: 'Dumbbell bench press' },
    knowledgeItemIds: ['substitution.preserving-stimulus'],
  },
  'program.preference_swap': {
    name: 'Swapped for preference',
    description: 'You asked to avoid this exercise, so I replaced it with the closest match.',
    tier1: 'You asked to avoid {from}, so {to} takes its place.',
    sample: { from: 'Barbell back squat', to: 'Hack squat' },
    knowledgeItemIds: ['substitution.preserving-stimulus'],
  },
} as const satisfies Record<string, RuleDefinition>;

export type RuleId = keyof typeof RULES;

export function isRuleId(value: string): value is RuleId {
  return Object.prototype.hasOwnProperty.call(RULES, value);
}
