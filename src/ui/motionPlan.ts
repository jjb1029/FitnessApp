import { motion } from './tokens';

/**
 * The timing rules behind the motion primitives (docs/16 §8), kept pure so the
 * promises this pass makes are tested rather than hoped: nothing over 250 ms,
 * nothing at all under reduced motion, meaning arrives in order, and numbers
 * only recount when Forma changed them.
 */

export type MotionKind = 'recount' | 'settle' | 'handOffOut' | 'handOffIn' | 'reveal' | 'ground';

/** The longest any state transition may take. A tired lifter never waits on the UI. */
export const STATE_TRANSITION_BUDGET_MS = 250;

export function motionDuration(kind: MotionKind, reduceMotion: boolean): number {
  return reduceMotion ? 0 : motion[kind];
}

export type HandOffTimeline = {
  /** The outgoing state fades. */
  out: number;
  /** The incoming state waits this long, then fades in over `in`. */
  inDelay: number;
  in: number;
  /** Supporting information follows the primary change. */
  revealDelay: number;
  reveal: number;
  /** The ground and the surface's height settle underneath. */
  ground: number;
  /** When everything has landed. */
  total: number;
};

/**
 * One hand-off, in the order meaning arrives: the old state leaves, the new
 * primary element arrives, its supporting information follows, and the ground
 * settles under all of it. Under reduced motion it is an instant state change.
 */
export function handOffTimeline(reduceMotion: boolean): HandOffTimeline {
  if (reduceMotion) return { out: 0, inDelay: 0, in: 0, revealDelay: 0, reveal: 0, ground: 0, total: 0 };
  const out = motion.handOffOut;
  const inDelay = motion.stagger;
  const inMs = motion.handOffIn;
  const revealDelay = motion.stagger * 2;
  const reveal = motion.reveal;
  const ground = motion.ground;
  return { out, inDelay, in: inMs, revealDelay, reveal, ground, total: Math.max(out, inDelay + inMs, revealDelay + reveal, ground) };
}

export type RecountSample = { trigger: string | number; value: string | number };

/**
 * A value recounts only when the thing it belongs to changed *and* the value
 * changed with it — a new exercise, a different prefill. When the user nudges
 * a stepper the trigger is unchanged, so the number stays still under their
 * thumb.
 */
export function shouldRecount(previous: RecountSample | null, next: RecountSample): boolean {
  if (previous === null) return false;
  return previous.trigger !== next.trigger && previous.value !== next.value;
}

/**
 * The room the list must leave for the dock: its fixed controls plus the
 * tallest stage it can show. Reserved up front, so entering rest never shifts
 * the workout underneath.
 */
export function reservedDockHeight(base: number, stageHeights: readonly number[]): number {
  const tallest = stageHeights.reduce((max, h) => (Number.isFinite(h) && h > max ? h : max), 0);
  return Math.ceil(base + tallest);
}
