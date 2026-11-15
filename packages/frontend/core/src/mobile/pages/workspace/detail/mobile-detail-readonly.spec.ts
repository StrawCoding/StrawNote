import type { DocMode } from '@blocksuite/affine/model';
import { describe, expect, it } from 'vitest';

import { computeMobileDetailReadonly } from './mobile-detail-readonly';

const base = {
  canEdit: true,
  isInTrash: false,
  enableKeyboardToolbar: false,
  enableEdgelessEditing: true,
};

describe('computeMobileDetailReadonly', () => {
  const modes: DocMode[] = ['page', 'illustration', 'edgeless'];

  it('blocks trash and permission', () => {
    expect(
      computeMobileDetailReadonly({ ...base, mode: 'page', canEdit: false })
    ).toBe(true);
    expect(
      computeMobileDetailReadonly({ ...base, mode: 'page', isInTrash: true })
    ).toBe(true);
  });

  it('does not tie edgeless to keyboard toolbar', () => {
    expect(
      computeMobileDetailReadonly({
        ...base,
        mode: 'edgeless',
        enableKeyboardToolbar: false,
        enableEdgelessEditing: true,
      })
    ).toBe(false);
  });

  it('gates page on keyboard toolbar only', () => {
    expect(computeMobileDetailReadonly({ ...base, mode: 'page' })).toBe(true);
    expect(
      computeMobileDetailReadonly({
        ...base,
        mode: 'page',
        enableKeyboardToolbar: true,
      })
    ).toBe(false);
  });

  it('keeps illustration editable without keyboard toolbar', () => {
    expect(
      computeMobileDetailReadonly({
        ...base,
        mode: 'illustration',
        enableKeyboardToolbar: false,
      })
    ).toBe(false);
  });

  it('gates edgeless when feature flag off', () => {
    expect(
      computeMobileDetailReadonly({
        ...base,
        mode: 'edgeless',
        enableEdgelessEditing: false,
      })
    ).toBe(true);
  });

  it.each(modes)('covers mode %s', mode => {
    expect(
      typeof computeMobileDetailReadonly({
        ...base,
        mode,
        enableKeyboardToolbar: true,
      })
    ).toBe('boolean');
  });
});
