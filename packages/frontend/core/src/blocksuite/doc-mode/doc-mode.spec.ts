import {
  type DocMode,
  DocModes,
  isCanvasEditorMode,
  isIllustrationMode,
  isPageEditorMode,
  PAGE_ILLUSTRATION_FRAME_TITLE,
} from '@blocksuite/affine/model';
import { describe, expect, test } from 'vitest';

describe('DocMode helpers', () => {
  test('DocModes includes illustration', () => {
    expect(DocModes).toContain('illustration');
  });

  test('illustration mounts page editor, not infinite canvas', () => {
    const page: DocMode = 'page';
    const edgeless: DocMode = 'edgeless';
    const illustration: DocMode = 'illustration';

    expect(isPageEditorMode(page)).toBe(true);
    expect(isPageEditorMode(edgeless)).toBe(false);
    expect(isPageEditorMode(illustration)).toBe(true);

    expect(isCanvasEditorMode(page)).toBe(false);
    expect(isCanvasEditorMode(edgeless)).toBe(true);
    expect(isCanvasEditorMode(illustration)).toBe(false);

    expect(isIllustrationMode(illustration)).toBe(true);
    expect(isIllustrationMode(page)).toBe(false);
  });

  test('page illustration frame title constant is stable', () => {
    expect(PAGE_ILLUSTRATION_FRAME_TITLE).toBe(
      '__strawnote_page_illustration__'
    );
  });
});
