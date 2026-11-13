import { getUnlockedGfxModels } from '@blocksuite/affine-shared/utils';
import { describe, expect, test } from 'vitest';

describe('edgeless locked elements must not be deleted', () => {
  test('filters locked models before delete', () => {
    const unlocked = { id: 'stroke', isLocked: () => false };
    const locked = { id: 'frame', isLocked: () => true };
    expect(getUnlockedGfxModels([unlocked, locked])).toEqual([unlocked]);
    expect(getUnlockedGfxModels([locked])).toEqual([]);
  });
});
