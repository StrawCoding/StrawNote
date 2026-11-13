import {
  type DocMode,
  DocModes,
  isCanvasEditorMode,
  isPageEditorMode,
} from '@blocksuite/affine/model';
import { describe, expect, test } from 'vitest';

describe('DocMode helpers', () => {
  test('DocModes includes illustration', () => {
    expect(DocModes).toContain('illustration');
  });

  test('page vs canvas classification', () => {
    const page: DocMode = 'page';
    const edgeless: DocMode = 'edgeless';
    const illustration: DocMode = 'illustration';

    expect(isPageEditorMode(page)).toBe(true);
    expect(isPageEditorMode(edgeless)).toBe(false);
    expect(isPageEditorMode(illustration)).toBe(false);

    expect(isCanvasEditorMode(page)).toBe(false);
    expect(isCanvasEditorMode(edgeless)).toBe(true);
    expect(isCanvasEditorMode(illustration)).toBe(true);
  });
});
