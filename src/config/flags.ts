/**
 * Entitlements and feature flags. Everything is on in development; production
 * ships the free core only until billing exists (docs/10 §1). Gated features
 * check `hasEntitlement()`; nothing else in the app knows about billing.
 */
export type Entitlement = 'coach' | 'sync' | 'advanced_analytics';

const DEV_ALL_ON = __DEV__;

const productionEntitlements: Record<Entitlement, boolean> = {
  coach: false,
  sync: false,
  advanced_analytics: false,
};

export function hasEntitlement(entitlement: Entitlement): boolean {
  if (DEV_ALL_ON) return true;
  return productionEntitlements[entitlement];
}

export const features = {
  /** The component gallery route, dev builds only. */
  gallery: __DEV__,
  /** Coach tab arrives in Phase 2. */
  coachTab: false,
  /** Nutrition tab arrives in Phase 3. */
  nutritionTab: false,
} as const;
