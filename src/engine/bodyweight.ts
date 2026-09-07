/** Bodyweight trend helpers (docs/05 §... and docs/13 §3): trends, never single weigh-ins. */

export type BodyweightPoint = { localDate: string; weightKg: number };

export type BodyweightTrend = {
  latestKg: number | null;
  latestDate: string | null;
  /** Mean of entries in the last 7 days ending at the latest entry. */
  avg7Kg: number | null;
  /** Change per week estimated from the last 28 days (least squares). Null with fewer than 4 entries over 7+ days. */
  ratePerWeekKg: number | null;
  entryCount: number;
};

function dayNumber(localDate: string): number {
  const [y, m, d] = localDate.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000;
}

export function bodyweightTrend(points: BodyweightPoint[]): BodyweightTrend {
  if (points.length === 0) return { latestKg: null, latestDate: null, avg7Kg: null, ratePerWeekKg: null, entryCount: 0 };
  const sorted = [...points].sort((a, b) => a.localDate.localeCompare(b.localDate));
  const latest = sorted[sorted.length - 1]!;
  const latestDay = dayNumber(latest.localDate);

  const last7 = sorted.filter((p) => latestDay - dayNumber(p.localDate) < 7);
  const avg7Kg = last7.reduce((a, p) => a + p.weightKg, 0) / last7.length;

  const last28 = sorted.filter((p) => latestDay - dayNumber(p.localDate) < 28);
  let ratePerWeekKg: number | null = null;
  if (last28.length >= 4) {
    const first = dayNumber(last28[0]!.localDate);
    const span = latestDay - first;
    if (span >= 7) {
      const xs = last28.map((p) => dayNumber(p.localDate) - first);
      const ys = last28.map((p) => p.weightKg);
      const n = xs.length;
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (xs[i]! - mx) * (ys[i]! - my);
        den += (xs[i]! - mx) ** 2;
      }
      ratePerWeekKg = den === 0 ? null : (num / den) * 7;
    }
  }

  return { latestKg: latest.weightKg, latestDate: latest.localDate, avg7Kg, ratePerWeekKg, entryCount: points.length };
}
