import { sessionHighlights, type HighlightInput } from './highlights';

const set = (loadKg: number | null, reps: number) => ({ loadKg, reps, rir: null });

const base: HighlightInput = { exerciseName: 'Incline press', sets: [], previous: [], isPr: false, prE1rmKg: null };

describe('sessionHighlights', () => {
  it('reports nothing when nothing changed', () => {
    const same = [set(34, 10), set(34, 10)];
    expect(sessionHighlights([{ ...base, sets: same, previous: same }])).toEqual([]);
  });

  it('says nothing for a first-ever exercise', () => {
    expect(sessionHighlights([{ ...base, sets: [set(34, 10)], previous: [] }])).toEqual([]);
  });

  it('reports a heavier load', () => {
    const h = sessionHighlights([{ ...base, sets: [set(36, 8), set(36, 8)], previous: [set(34, 10), set(34, 10)] }]);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ kind: 'load', exerciseName: 'Incline press', deltaKg: 2 });
  });

  it('reports more reps at the same load', () => {
    const h = sessionHighlights([{ ...base, sets: [set(34, 11), set(34, 10)], previous: [set(34, 10), set(34, 10)] }]);
    expect(h[0]).toMatchObject({ kind: 'reps', deltaReps: 1, loadKg: 34 });
  });

  it('does not credit reps when a set was added', () => {
    const h = sessionHighlights([{ ...base, sets: [set(34, 10), set(34, 10), set(34, 10)], previous: [set(34, 10), set(34, 10)] }]);
    expect(h).toEqual([]);
  });

  it('puts records first and caps the list', () => {
    const items: HighlightInput[] = [
      { ...base, exerciseName: 'Reps up', sets: [set(34, 11)], previous: [set(34, 10)] },
      { ...base, exerciseName: 'Heavier', sets: [set(36, 10)], previous: [set(34, 10)] },
      { ...base, exerciseName: 'Record', sets: [set(50, 5)], previous: [set(40, 5)], isPr: true, prE1rmKg: 58 },
    ];
    const h = sessionHighlights(items, 2);
    expect(h).toHaveLength(2);
    expect(h[0]).toMatchObject({ kind: 'pr', exerciseName: 'Record' });
    expect(h[1]).toMatchObject({ kind: 'load', exerciseName: 'Heavier' });
  });

  it('handles bodyweight exercises by reps', () => {
    const h = sessionHighlights([{ ...base, exerciseName: 'Pull-up', sets: [set(null, 9)], previous: [set(null, 7)] }]);
    expect(h[0]).toMatchObject({ kind: 'reps', deltaReps: 2, loadKg: null });
  });
});
