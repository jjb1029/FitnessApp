import type { EquipmentId, Exercise, Explanation, MovementPattern, MuscleId, RepRange, SwapReason } from '@/domain';

import { buildExplanation } from './explanations';

/** Reasons the engine itself swaps during program creation, beyond user reasons. */
export type SubstitutionReason = SwapReason | 'program_fill';

export type SubstituteInput = {
  source: Exercise;
  reason: SubstitutionReason;
  candidates: Exercise[];
  availableEquipment: ReadonlySet<EquipmentId>;
  avoidIds?: ReadonlySet<string>;
  /** The template's rep range, to prefer candidates that support it. */
  repRange?: RepRange;
  /** Recently swapped-to exercises to avoid for variety. */
  recentIds?: ReadonlySet<string>;
  limit?: number;
};

export type SubstituteBreakdown = {
  primaryOverlap: number;
  pattern: number;
  secondaryOverlap: number;
  repRangeFit: number;
  reasonAdjustment: number;
  curatedBonus: number;
};

export type RankedSubstitute = {
  exercise: Exercise;
  /** 0–100, presented to the user as "similarity". */
  score: number;
  reasonLine: string;
  breakdown: SubstituteBreakdown;
  explanation: Explanation;
};

const RELATED_PATTERNS: Partial<Record<MovementPattern, MovementPattern[]>> = {
  squat: ['knee_extension', 'lunge'],
  lunge: ['squat', 'knee_extension'],
  knee_extension: ['squat', 'lunge'],
  hinge: ['knee_flexion'],
  knee_flexion: ['hinge'],
  horizontal_pull: ['vertical_pull'],
  vertical_pull: ['horizontal_pull'],
  horizontal_push: ['vertical_push', 'shoulder_transverse'],
  vertical_push: ['horizontal_push'],
  shoulder_transverse: ['horizontal_push'],
};

export function isEquipmentAvailable(exercise: Exercise, available: ReadonlySet<EquipmentId>): boolean {
  return exercise.equipmentIds.every((id) => id === 'bodyweight' || available.has(id));
}

function muscleSet(exercise: Exercise, role: 'primary' | 'secondary'): Set<MuscleId> {
  return new Set(exercise.muscles.filter((m) => m.role === role).map((m) => m.muscleId));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function equipmentCategory(exercise: Exercise): string {
  const ids = exercise.equipmentIds;
  if (ids.includes('machine')) return 'machine';
  if (ids.includes('cable')) return 'cable';
  if (ids.includes('smith')) return 'smith';
  if (ids.includes('barbell') || ids.includes('ez_bar') || ids.includes('trap_bar')) return 'barbell';
  if (ids.includes('dumbbell')) return 'dumbbell';
  if (ids.includes('kettlebell')) return 'kettlebell';
  if (ids.includes('band')) return 'band';
  return 'bodyweight';
}

/**
 * Rank alternatives that preserve the training stimulus (docs/05 §4).
 * Hard filters: equipment, avoid list, the source itself.
 */
export function rankSubstitutes(input: SubstituteInput): RankedSubstitute[] {
  const { source, reason, candidates, availableEquipment, avoidIds, repRange, recentIds, limit = 5 } = input;
  const srcPrimary = muscleSet(source, 'primary');
  const srcSecondary = muscleSet(source, 'secondary');
  const srcCategory = equipmentCategory(source);
  const related = new Set(RELATED_PATTERNS[source.movementPattern] ?? []);

  const ranked: RankedSubstitute[] = [];

  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;
    if (avoidIds?.has(candidate.id)) continue;
    if (!isEquipmentAvailable(candidate, availableEquipment)) continue;
    if (reason === 'variety' && recentIds?.has(candidate.id)) continue;

    const candPrimary = muscleSet(candidate, 'primary');
    const primaryOverlapRaw = jaccard(srcPrimary, candPrimary);
    if (primaryOverlapRaw === 0) continue; // must share at least one primary muscle

    // Weights: primary 30 · pattern 25 · secondary 10 · rep fit 10 · loading 10 · reason ≤ 15 · curated 10.
    const primaryOverlap = 30 * primaryOverlapRaw;
    const pattern = candidate.movementPattern === source.movementPattern ? 25 : related.has(candidate.movementPattern) ? 12.5 : 0;
    const secondaryOverlap = 10 * jaccard(srcSecondary, muscleSet(candidate, 'secondary'));

    let repRangeFit = 10;
    if (repRange) {
      const inside = repRange.min >= candidate.repRangeAllowed.min && repRange.max <= candidate.repRangeAllowed.max;
      const overlaps = repRange.max >= candidate.repRangeAllowed.min && repRange.min <= candidate.repRangeAllowed.max;
      repRangeFit = inside ? 10 : overlaps ? 5 : 0;
    }

    // Loading similarity: a compound with similar systemic demand replaces a compound better than a light isolation move.
    const loading = (candidate.category === source.category ? 5 : 0) + 5 * (1 - Math.abs(candidate.fatigueCost - source.fatigueCost) / 4);

    const candCategory = equipmentCategory(candidate);
    let reasonAdjustment = 0;
    switch (reason) {
      case 'equipment':
      case 'program_fill':
        reasonAdjustment = 15; // neutral; equipment is already a hard filter
        break;
      case 'dislike':
        reasonAdjustment = candCategory !== srcCategory ? 15 : 5;
        break;
      case 'discomfort': {
        const stabilityGain = Math.max(0, source.stability - candidate.stability) / 4; // 0..1
        const difficultyGain = Math.max(0, source.difficulty - candidate.difficulty) / 4;
        const isRegression = source.regressionIds.includes(candidate.id) ? 1 : 0;
        reasonAdjustment = 8 * stabilityGain + 4 * difficultyGain + 3 * isRegression;
        break;
      }
      case 'too_hard': {
        const easier = Math.max(0, source.difficulty - candidate.difficulty) / 4;
        const isRegression = source.regressionIds.includes(candidate.id) ? 1 : 0;
        reasonAdjustment = 9 * easier + 6 * isRegression;
        break;
      }
      case 'too_easy': {
        if (source.regressionIds.includes(candidate.id)) continue;
        const harder = Math.max(0, candidate.difficulty - source.difficulty) / 4;
        reasonAdjustment = 15 * harder;
        break;
      }
      case 'variety':
        if (candCategory === srcCategory) continue;
        reasonAdjustment = 12;
        break;
    }

    const curatedBonus = source.alternativeIds.includes(candidate.id) ? 10 : 0;
    const score = Math.min(100, Math.round(primaryOverlap + pattern + secondaryOverlap + repRangeFit + loading + reasonAdjustment + curatedBonus));

    const samePattern = candidate.movementPattern === source.movementPattern;
    const stabilityWord = candidate.stability < source.stability ? 'more stable' : candidate.stability > source.stability ? 'more free-weight' : null;
    const reasonLine = [samePattern ? 'Same movement pattern' : primaryOverlapRaw >= 0.5 ? 'Same muscles, different pattern' : 'Overlapping muscles', stabilityWord, candCategory !== srcCategory ? `uses ${candCategory === 'bodyweight' ? 'bodyweight' : candCategory + 's'}` : null]
      .filter(Boolean)
      .join(', ');

    const explanation = buildExplanation({
      ruleId: reason === 'discomfort' ? 'substitution.discomfort' : 'substitution.rank',
      confidence: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
      factors: [
        { label: 'Muscles', value: [...candPrimary].join(', ').replace(/_/g, ' ') },
        { label: 'Pattern', value: samePattern ? 'same' : related.has(candidate.movementPattern) ? 'related' : 'different' },
        { label: 'Similarity', value: `${score}%` },
      ],
      evidence: [{ kind: 'template', label: `${source.name} → ${candidate.name}` }],
      counterfactual: reason === 'equipment' || reason === 'program_fill' ? `If ${source.name.toLowerCase()} becomes available, the program can switch back.` : undefined,
    });

    ranked.push({ exercise: candidate, score, reasonLine, breakdown: { primaryOverlap, pattern, secondaryOverlap, repRangeFit, reasonAdjustment, curatedBonus }, explanation });
  }

  ranked.sort((a, b) => b.score - a.score || a.exercise.fatigueCost - b.exercise.fatigueCost || a.exercise.name.localeCompare(b.exercise.name));
  const top = ranked.slice(0, limit);
  // Tier 2: the two runners-up, so the user sees what else was considered.
  for (const r of top) {
    r.explanation = {
      ...r.explanation,
      alternatives: top
        .filter((o) => o !== r)
        .slice(0, 2)
        .map((o) => ({ label: o.exercise.name, reason: `${o.score}% similar · ${o.reasonLine}` })),
    };
  }
  return top;
}
