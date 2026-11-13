import { describe, expect, test } from 'vitest';

import { getUnlockedGfxModels } from '../../utils/edgeless';

describe('getUnlockedGfxModels', () => {
  test('keeps only unlocked elements', () => {
    const unlocked = { id: 'a', isLocked: () => false };
    const locked = { id: 'b', isLocked: () => true };

    expect(getUnlockedGfxModels([unlocked, locked])).toEqual([unlocked]);
  });

  test('returns empty when every element is locked', () => {
    const locked = { id: 'b', isLocked: () => true };
    expect(getUnlockedGfxModels([locked])).toEqual([]);
  });
});
