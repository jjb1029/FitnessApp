import { bodyweightTrend } from './bodyweight';

describe('bodyweightTrend', () => {
  it('handles no data', () => {
    expect(bodyweightTrend([]).latestKg).toBeNull();
  });

  it('averages the last seven days and estimates a weekly rate', () => {
    const points = Array.from({ length: 28 }, (_, i) => ({
      localDate: `2026-08-${String(i + 1).padStart(2, '0')}`,
      weightKg: 85 - i * (0.3 / 7), // losing 0.3 kg per week
    }));
    const t = bodyweightTrend(points);
    expect(t.latestKg).toBeCloseTo(85 - 27 * (0.3 / 7), 5);
    expect(t.avg7Kg).toBeCloseTo((points.slice(21).reduce((a, p) => a + p.weightKg, 0)) / 7, 5);
    expect(t.ratePerWeekKg).toBeCloseTo(-0.3, 3);
  });

  it('withholds a rate with too little data', () => {
    const t = bodyweightTrend([
      { localDate: '2026-09-01', weightKg: 80 },
      { localDate: '2026-09-02', weightKg: 80.5 },
    ]);
    expect(t.ratePerWeekKg).toBeNull();
    expect(t.avg7Kg).toBeCloseTo(80.25, 5);
  });
});
