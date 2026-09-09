/**
 * Forma's voice (docs/14 §2). Every line is chosen by a state the engine or
 * the session produced; nothing here is decorative. Variants rotate by a
 * deterministic seed so a session does not repeat itself and a re-render
 * never changes a line.
 *
 * Rules: short declaratives, periods, no exclamation marks, no emoji.
 * "I" for Forma's decisions, "you" for the user's effort, "we" rarely.
 */

import type { RepRange } from '@/domain';

export type SetOutcome = 'hit' | 'above' | 'better' | 'below' | 'edit';

export function pick<T>(variants: readonly T[], seed: number): T {
  const i = Math.abs(Math.floor(seed)) % variants.length;
  return variants[i]!;
}

// ---------- Set completion ----------

export type GradeSetInput = {
  reps: number;
  loadKg: number | null;
  repRange: RepRange;
  /** The same set index from the previous session, when it exists. */
  previous?: { reps: number; loadKg: number | null } | null;
  edit?: boolean;
};

/** What kind of set was that, relative to the target and to last time. */
export function gradeSet(input: GradeSetInput): SetOutcome {
  if (input.edit) return 'edit';
  const { reps, loadKg, repRange, previous } = input;
  if (reps < repRange.min) return 'below';
  if (previous) {
    const sameOrHeavier = loadKg === null || previous.loadKg === null ? true : loadKg >= previous.loadKg - 0.01;
    const heavier = loadKg !== null && previous.loadKg !== null && loadKg > previous.loadKg + 0.01;
    if ((sameOrHeavier && reps > previous.reps) || (heavier && reps >= previous.reps)) return 'better';
  }
  if (reps > repRange.max) return 'above';
  return 'hit';
}

export type AcknowledgementInput = {
  outcome: SetOutcome;
  /** 0-based index of the set just completed within the exercise. */
  setIndex: number;
  /** Working sets still planned after this one. */
  setsRemaining: number;
};

export function setAcknowledgement({ outcome, setIndex, setsRemaining }: AcknowledgementInput): string {
  switch (outcome) {
    case 'edit':
      return 'Updated.';
    case 'below':
      return pick(['Tough set. Logged. I will account for that.', 'Logged. I will account for that next time.'], setIndex);
    case 'better':
      return pick(['That was better than last time.', 'Better than last time. Noted.'], setIndex);
    case 'above':
      return pick(['Above target. I will account for that next time.', 'Above target. Noted.'], setIndex);
    case 'hit':
      if (setsRemaining === 1) return 'Nice. One more.';
      return pick(['Good set.', 'Right where we wanted you.', 'Good set.'], setIndex);
  }
}

// ---------- Targets ----------

export type TargetLineInput = {
  ruleId: string;
  /** Display strings in the user's unit, e.g. "80 lb". Null when there is no suggestion. */
  loadDisplay: string | null;
  previousLoadDisplay: string | null;
  reps: number;
  targetRir: number;
  isBodyweight: boolean;
};

/** The dock's context line: Forma's sentence about the current target. */
export function targetLine(t: TargetLineInput): string {
  if (t.ruleId === 'progression.seed' || t.loadDisplay === null) {
    return t.isBodyweight ? `Bodyweight today. Aim for ${t.reps} with room to spare.` : `Pick a weight you can do ${t.reps} with room to spare.`;
  }
  const load = t.isBodyweight ? `Bodyweight ${t.loadDisplay}` : t.loadDisplay;
  if (t.ruleId.includes('layoff')) return `${load} today. Eased after time off.`;
  if (t.ruleId.includes('reduce_load')) return `${load} today. Eased after two tough sessions.`;
  if (t.ruleId.includes('increase') || t.ruleId.includes('add_load') || t.ruleId.includes('calibrate') || t.ruleId.includes('assisted.reduce')) {
    return t.previousLoadDisplay ? `${load} today. Up from ${t.previousLoadDisplay}.` : `${load} today.`;
  }
  if (t.ruleId.includes('add_rep') || t.ruleId === 'progression.reps_only') return `${load} today. Aim for ${t.reps}.`;
  if (t.ruleId.includes('consolidate') || t.ruleId.includes('hold_reps')) return `${load} today. Same reps, more in reserve.`;
  if (t.ruleId.includes('hold_after_miss') || t.ruleId.includes('to_double')) return `${load} today. Same as last time; aim for ${t.reps}.`;
  if (t.ruleId.includes('same_day')) return `${load} today. Same as this morning.`;
  return `${load} today.`;
}

export const ENTER_WEIGHT_LINE = 'Enter a weight to log.';

/** After the first set the dock only needs the count; the fields already carry the numbers. */
export function setLine(setNumber: number, planned: number): string {
  if (planned > 0 && setNumber >= planned) return `Last set of ${planned}.`;
  return `Set ${setNumber} of ${Math.max(planned, setNumber)}.`;
}

/** Title for the Why sheet: the decision itself. */
export function whyTitle(t: { ruleId: string; loadDisplay: string | null; when: 'today' | 'next time'; isBodyweight: boolean }): string {
  if (t.loadDisplay === null || t.ruleId === 'progression.seed') return 'Starting load';
  const load = t.isBodyweight ? `Bodyweight ${t.loadDisplay}` : t.loadDisplay;
  if (t.ruleId.includes('increase') || t.ruleId.includes('add_load') || t.ruleId.includes('calibrate')) return `${load} ${t.when}`;
  if (t.ruleId.includes('layoff') || t.ruleId.includes('reduce')) return `Eased to ${load}`;
  return `Hold at ${load}`;
}

// ---------- Rest and flow ----------

export const REST_UP_LINE = "Rest's up.";

export function exerciseDoneLine(doneName: string, nextName: string | null): string {
  return nextName ? `${doneName} done. ${nextName} is next.` : "That's the last one.";
}

export function prLine(e1rmDisplay: string, deltaDisplay: string | null): string {
  return deltaDisplay ? `New best. ${e1rmDisplay} estimated max, up ${deltaDisplay}.` : `New best. ${e1rmDisplay} estimated max.`;
}

// ---------- Finish ----------

export type FinishVerdictInput = {
  workingSets: number;
  allTargetsHit: boolean;
  increases: number;
  earlyFinish: boolean;
  prCount: number;
};

export function finishVerdict(v: FinishVerdictInput): string {
  if (v.workingSets === 0) return 'Nothing logged this time. The plan is unchanged.';
  const lifts = v.increases === 1 ? 'One lift goes up next time.' : v.increases > 1 ? `${v.increases} lifts go up next time.` : null;
  if (v.earlyFinish) return lifts ? `Good stopping point. ${lifts}` : 'Good stopping point. Nothing is lost.';
  if (v.prCount > 0) return lifts ? `You got stronger today. ${lifts}` : 'You got stronger today.';
  if (v.allTargetsHit) return lifts ? `Every target hit. ${lifts}` : 'Every target hit. I have set next time.';
  return lifts ? `Solid session. ${lifts}` : 'Solid session. I have set next time.';
}

export const DONE_FOR_TODAY = 'Done for today';

// ---------- Home ----------

export type TodayLineInput = {
  focus: string[];
  increases: { name: string; loadDisplay: string }[];
  firstSession: boolean;
  welcomeBackPercent: number | null;
};

/** One sentence under the day name: what today is about, from the engine's targets. */
export function todayLine(t: TodayLineInput): string {
  const focus = t.focus.length > 0 ? `${joinNatural(t.focus)}.` : '';
  if (t.welcomeBackPercent !== null) return `${focus} Welcome back. I have eased today's loads by ${t.welcomeBackPercent}%.`.trim();
  if (t.firstSession) return `${focus} Your first session. Find your weights and I will take it from there.`.trim();
  if (t.increases.length === 1) return `${focus} ${t.increases[0]!.name} goes up to ${t.increases[0]!.loadDisplay}.`.trim();
  if (t.increases.length > 1) return `${focus} ${t.increases.length} lifts go up today, starting with ${t.increases[0]!.name.toLowerCase()}.`.trim();
  return `${focus} Same weights as last time. Add a rep where you can.`.trim();
}

/** Header fragment, no period: it sits before a separator. */
export function readyLine(dayName: string): string {
  return `${dayName} is ready`;
}

/** "Chest, lats, and side delts": first item keeps its case, the rest read as prose. */
function joinNatural(items: string[]): string {
  const prose = items.map((s, i) => (i === 0 ? s : s.toLowerCase()));
  if (prose.length <= 1) return prose[0] ?? '';
  if (prose.length === 2) return `${prose[0]} and ${prose[1]}`;
  return `${prose.slice(0, -1).join(', ')}, and ${prose[prose.length - 1]}`;
}
