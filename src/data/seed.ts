import { eq } from 'drizzle-orm';

import { Equipment, Exercise, Muscle, ProgramTemplate } from '@/domain';
import { EQUIPMENT_SEED, EXERCISE_SEED, MUSCLE_SEED } from '@/exercises';
import { PROGRAM_TEMPLATES } from '@/exercises/programs';
import { nowIso } from '@/lib/dates';

import type { Db } from './db';
import { catalogMeta, equipment, exercises, muscles, programTemplates } from './schema';

/** Bump when seed content changes; rows with a lower catalog_version are upserted. */
export const CATALOG_VERSION = 1;

/**
 * Loads reference data on first launch and upgrades it when CATALOG_VERSION
 * changes. Never touches user-created exercises. Runs in one transaction.
 */
export async function seedCatalog(db: Db): Promise<void> {
  const current = await db.select().from(catalogMeta).where(eq(catalogMeta.key, 'catalog_version')).get();
  if (current && Number(current.value) >= CATALOG_VERSION) return;

  const now = nowIso();
  const validatedMuscles = MUSCLE_SEED.map((m) => Muscle.parse(m));
  const validatedEquipment = EQUIPMENT_SEED.map((e) => Equipment.parse(e));
  const validatedExercises = EXERCISE_SEED.map((e) => Exercise.parse({ ...e, isCustom: false, createdByUserId: null, catalogVersion: CATALOG_VERSION }));
  const validatedTemplates = PROGRAM_TEMPLATES.map((t) => ProgramTemplate.parse(t));

  await db.transaction(async (tx) => {
    for (const m of validatedMuscles) {
      await tx.insert(muscles).values(m).onConflictDoUpdate({ target: muscles.id, set: m });
    }
    for (const e of validatedEquipment) {
      await tx.insert(equipment).values(e).onConflictDoUpdate({ target: equipment.id, set: e });
    }
    for (const e of validatedExercises) {
      const row = { ...e, createdAt: now, updatedAt: now, deletedAt: null, version: 1 };
      await tx
        .insert(exercises)
        .values(row)
        .onConflictDoUpdate({ target: exercises.id, set: { ...row, createdAt: undefined } });
    }
    for (const t of validatedTemplates) {
      const row = { id: t.id, data: t, catalogVersion: CATALOG_VERSION };
      await tx.insert(programTemplates).values(row).onConflictDoUpdate({ target: programTemplates.id, set: row });
    }
    await tx
      .insert(catalogMeta)
      .values({ key: 'catalog_version', value: String(CATALOG_VERSION) })
      .onConflictDoUpdate({ target: catalogMeta.key, set: { value: String(CATALOG_VERSION) } });
  });
}
