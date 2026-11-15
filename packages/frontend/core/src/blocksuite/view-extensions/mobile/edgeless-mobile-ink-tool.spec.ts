import { DefaultTool } from '@blocksuite/affine/blocks/surface';
import { describe, expect, it } from 'vitest';

import {
  gfxToolNameToInkTool,
  inkToolToGfxTool,
} from './edgeless-mobile-ink-tool';

describe('gfxToolNameToInkTool', () => {
  it('maps drawing and navigation tools', () => {
    expect(gfxToolNameToInkTool('brush')).toBe('brush');
    expect(gfxToolNameToInkTool('highlighter')).toBe('brush');
    expect(gfxToolNameToInkTool('eraser')).toBe('eraser');
    expect(gfxToolNameToInkTool('pan')).toBe('pan');
    expect(gfxToolNameToInkTool(DefaultTool.toolName)).toBe('pan');
    expect(gfxToolNameToInkTool('shape')).toBe('brush');
  });
});

describe('inkToolToGfxTool', () => {
  it('returns gfx tool classes', () => {
    expect(inkToolToGfxTool('brush').toolName).toBe('brush');
    expect(inkToolToGfxTool('eraser').toolName).toBe('eraser');
    expect(inkToolToGfxTool('pan').toolName).toBe('pan');
  });
});
