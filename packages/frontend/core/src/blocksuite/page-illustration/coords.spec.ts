import { describe, expect, test } from 'vitest';

import { clientToPageContentPoint, isNearPolyline } from './coords';

describe('page-illustration coords', () => {
  test('maps client point into scrolled content space', () => {
    const el = {
      getBoundingClientRect: () =>
        ({ left: 100, top: 50, width: 400, height: 600 }) as DOMRect,
      scrollLeft: 20,
      scrollTop: 80,
    } as HTMLElement;

    expect(clientToPageContentPoint(150, 100, el)).toEqual([70, 130]);
  });

  test('hit-tests near polyline segments', () => {
    const line: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    expect(isNearPolyline([5, 1], line, 2)).toBe(true);
    expect(isNearPolyline([50, 50], line, 2)).toBe(false);
  });
});
