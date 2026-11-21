import { isTopLevelBlock } from '@blocksuite/affine-shared/utils';
import { type IVec, Vec } from '@blocksuite/global/gfx';
import type { GfxModel } from '@blocksuite/std/gfx';

/** Swept eraser disk: retain line intersections and include nearby geometry. */
export function eraserSweptHit(
  model: GfxModel,
  start: IVec,
  end: IVec,
  radius: number
): boolean {
  if (model.getLineIntersections(start, end)) return true;
  const steps = Math.max(
    1,
    Math.ceil(Vec.dist(start, end) / Math.max(1, radius / 2))
  );
  for (let i = 0; i <= steps; i++) {
    const point: IVec = [
      start[0] + ((end[0] - start[0]) * i) / steps,
      start[1] + ((end[1] - start[1]) * i) / steps,
    ];
    if (Vec.dist(point, model.getNearestPoint(point)) <= radius) return true;
  }
  return false;
}

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
