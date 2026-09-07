import { z } from 'zod';

import { DataSource, MeasurementSite, PhotoPose } from './enums';

export const BodyweightEntry = z.object({
  id: z.string(),
  userId: z.string(),
  weightKg: z.number().positive(),
  measuredAt: z.string(),
  localDate: z.string(),
  source: DataSource,
  externalId: z.string().nullable(),
});
export type BodyweightEntry = z.infer<typeof BodyweightEntry>;

export const Measurement = z.object({
  id: z.string(),
  userId: z.string(),
  site: MeasurementSite,
  valueCm: z.number().positive(),
  measuredAt: z.string(),
  localDate: z.string(),
});
export type Measurement = z.infer<typeof Measurement>;

export const ProgressPhoto = z.object({
  id: z.string(),
  userId: z.string(),
  takenAt: z.string(),
  localDate: z.string(),
  pose: PhotoPose,
  fileUri: z.string(),
  bodyweightEntryId: z.string().nullable(),
});
export type ProgressPhoto = z.infer<typeof ProgressPhoto>;
