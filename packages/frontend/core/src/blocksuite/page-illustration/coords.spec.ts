import { describe, expect, test } from 'vitest';

import {
  clientToPageContentPoint,
  contentLayerOffsetInOverlay,
  isNearPolyline,
  parseHexColor,
} from './coords';

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

  test('positions layer so document (0,0) matches content origin', () => {
    const content = {
      getBoundingClientRect: () =>
        ({ left: 120, top: 200, width: 400, height: 600 }) as DOMRect,
      scrollLeft: 10,
      scrollTop: 40,
    } as HTMLElement;
    const overlay = {
      getBoundingClientRect: () =>
        ({ left: 100, top: 80, width: 500, height: 800 }) as DOMRect,
    } as HTMLElement;

    expect(contentLayerOffsetInOverlay(content, overlay)).toEqual({
      left: 10,
      top: 80,
    });
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

  test('parses hex colors', () => {
    expect(parseHexColor('#abc')).toBe('#aabbcc');
    expect(parseHexColor('AABBCC')).toBe('#aabbcc');
    expect(parseHexColor('#ff00aa')).toBe('#ff00aa');
    expect(parseHexColor('nope')).toBeNull();
  });
});
