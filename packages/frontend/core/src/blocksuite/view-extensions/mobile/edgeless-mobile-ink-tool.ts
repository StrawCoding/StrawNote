import { DefaultTool } from '@blocksuite/affine/blocks/surface';
import {
  BrushTool,
  EraserTool,
  HighlighterTool,
} from '@blocksuite/affine/gfx/brush';
import { PanTool } from '@blocksuite/affine/gfx/pointer';

import type { StylusInkTool } from './stylus-ink-toolbar';

/** Map BlockSuite gfx tool name → shared StylusInkToolbar mode. */
export function gfxToolNameToInkTool(toolName: string): StylusInkTool {
  if (toolName === 'eraser') return 'eraser';
  if (toolName === 'pan' || toolName === DefaultTool.toolName) return 'pan';
  if (toolName === 'brush' || toolName === HighlighterTool.toolName) {
    return 'brush';
  }
  return 'brush';
}

export function inkToolToGfxTool(tool: StylusInkTool) {
  switch (tool) {
    case 'eraser':
      return EraserTool;
    case 'pan':
      return PanTool;
    case 'brush':
    default:
      return BrushTool;
  }
}
