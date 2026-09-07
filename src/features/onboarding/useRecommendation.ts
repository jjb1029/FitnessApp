import { useEffect, useState } from 'react';

import { getExerciseMap, getTemplates } from '@/data/repositories';
import type { Exercise, ProgramTemplate } from '@/domain';
import { selectProgram, type ProgramRecommendation } from '@/engine';
import { chipsToEquipment, useOnboardingStore } from '@/store/onboardingStore';

export type RecommendationState = {
  recommendation: ProgramRecommendation | null;
  loading: boolean;
  error: Error | null;
  templates: ProgramTemplate[];
  exercises: Map<string, Exercise>;
};

/** Loads the catalog once and recomputes the recommendation from the draft answers. */
export function useRecommendation(): RecommendationState {
  const [catalog, setCatalog] = useState<{ templates: ProgramTemplate[]; exercises: Map<string, Exercise> } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const draft = useOnboardingStore();

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTemplates(), getExerciseMap()])
      .then(([templates, exercises]) => {
        if (!cancelled) setCatalog({ templates, exercises });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  let recommendation: ProgramRecommendation | null = null;
  if (catalog && draft.goal) {
    const templates = draft.chosenTemplateId ? catalog.templates.filter((t) => t.id === draft.chosenTemplateId).concat(catalog.templates.filter((t) => t.id !== draft.chosenTemplateId)) : catalog.templates;
    try {
      const base = {
        experience: draft.experience,
        daysPerWeek: draft.daysPerWeek,
        sessionMinutes: draft.sessionMinutes,
        goal: draft.goal,
        availableEquipment: new Set(chipsToEquipment(draft.equipmentChips)),
        avoidIds: draft.avoidExerciseIds,
        exercises: catalog.exercises,
      };
      recommendation = draft.chosenTemplateId
        ? // A chosen template wins regardless of score; alternatives come from the natural ranking.
          { ...selectProgram({ ...base, templates: templates.slice(0, 1) }), alternatives: selectProgram({ ...base, templates: catalog.templates }).alternatives.filter((a) => a.template.id !== draft.chosenTemplateId) }
        : selectProgram({ ...base, templates: catalog.templates });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  return { recommendation, loading: !catalog && !error, error, templates: catalog?.templates ?? [], exercises: catalog?.exercises ?? new Map() };
}
