import { describe, expect, test } from 'vitest';

import { getSolidStrokePoints } from '../gfx/perfect-freehand/get-solid-stroke-points.js';

describe('getSolidStrokePoints', () => {
  test('accepts streamline option without throwing', () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 2],
      [20, 0],
      [30, 4],
    ];
    const low = getSolidStrokePoints(points, 4, { streamline: 0.1 });
    const high = getSolidStrokePoints(points, 4, { streamline: 0.9 });
    expect(low.length).toBeGreaterThan(0);
    expect(high.length).toBeGreaterThan(0);
  });

  test('clamps invalid streamline', () => {
    const points: [number, number][] = [
      [0, 0],
      [5, 5],
    ];
    expect(() =>
      getSolidStrokePoints(points, 4, { streamline: 2 })
    ).not.toThrow();
    expect(() =>
      getSolidStrokePoints(points, 4, { streamline: -1 })
    ).not.toThrow();
  });
});
