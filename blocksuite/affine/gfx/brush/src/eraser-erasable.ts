import { isTopLevelBlock } from '@blocksuite/affine-shared/utils';
import type { GfxModel } from '@blocksuite/std/gfx';

/**
 * Edgeless note cards embed page / markdown content — protected from eraser by default
 * (StrawNote: avoid wiping MD blocks while erasing ink strokes).
 */
export const ERASER_PROTECTED_TOP_BLOCK_FLAVOURS = new Set(['affine:note']);

export function isProtectedFromDefaultEraser(model: GfxModel): boolean {
  if (!isTopLevelBlock(model)) return false;
  return ERASER_PROTECTED_TOP_BLOCK_FLAVOURS.has(model.flavour);
}

export function collectDefaultErasableTargets(
  canvasElements: Iterable<GfxModel>,
  blocks: Iterable<GfxModel>
): GfxModel[] {
  const out: GfxModel[] = [...canvasElements];
  for (const block of blocks) {
    if (!isProtectedFromDefaultEraser(block)) {
      out.push(block);
    }
  }
  return out;
}
