import { describe, expect, it } from 'vitest';

import { clampNativeSearchWindow, NATIVE_INDEXER_MAX_LIMIT } from './index';

describe('clampNativeSearchWindow', () => {
  it('maps Infinity into the memory-indexer hard window', () => {
    expect(clampNativeSearchWindow(Infinity)).toEqual({
      limit: NATIVE_INDEXER_MAX_LIMIT,
      offset: 0,
    });
  });

  it('caps oversized limit and offset+limit windows', () => {
    expect(clampNativeSearchWindow(50_000)).toEqual({
      limit: NATIVE_INDEXER_MAX_LIMIT,
      offset: 0,
    });
    expect(clampNativeSearchWindow(2_000, 9_500)).toEqual({
      limit: 500,
      offset: 9_500,
    });
    expect(clampNativeSearchWindow(Infinity, 9_000)).toEqual({
      limit: 1_000,
      offset: 9_000,
    });
  });

  it('never exceeds the native max window', () => {
    const { limit, offset } = clampNativeSearchWindow(0xffffffff, 0xffffffff);
    expect(offset).toBe(NATIVE_INDEXER_MAX_LIMIT);
    expect(limit).toBe(0);
    expect(offset + limit).toBeLessThanOrEqual(NATIVE_INDEXER_MAX_LIMIT);
  });
});
