import { getSurfaceBlock } from '@blocksuite/affine/blocks/surface';
import {
  BrushElementModel,
  FrameBlockModel,
  PAGE_ILLUSTRATION_FRAME_TITLE,
} from '@blocksuite/affine/model';
import type { GfxPrimitiveElementModel } from '@blocksuite/affine/std/gfx';
import type { Store } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';
import * as Y from 'yjs';

export function getDocSurface(doc: Store) {
  return getSurfaceBlock(doc);
}

export function isPageIllustrationFrame(
  model: FrameBlockModel | null | undefined
): boolean {
  if (!model) return false;
  return model.props.title.toString() === PAGE_ILLUSTRATION_FRAME_TITLE;
}

export function findPageIllustrationFrame(doc: Store): FrameBlockModel | null {
  const surface = getDocSurface(doc);
  if (!surface) return null;

  for (const child of surface.children) {
    if (child instanceof FrameBlockModel && isPageIllustrationFrame(child)) {
      return child;
    }
  }
  return null;
}

/**
 * Ensure a dedicated frame exists for page-illustration ink.
 * Brush children are stored with `hidden: true` so edgeless does not paint them.
 */
export function ensurePageIllustrationFrame(
  doc: Store,
  size: { width: number; height: number }
): FrameBlockModel | null {
  const surface = getDocSurface(doc);
  if (!surface) return null;

  let frame = findPageIllustrationFrame(doc);
  const xywh = `[0,0,${Math.max(1, Math.round(size.width))},${Math.max(1, Math.round(size.height))}]`;

  if (!frame) {
    const id = doc.addBlock(
      'affine:frame',
      {
        title: new Text(new Y.Text(PAGE_ILLUSTRATION_FRAME_TITLE)),
        xywh,
        background: 'transparent',
      },
      surface.id
    );
    frame = doc.getBlock(id)?.model as FrameBlockModel | undefined;
    if (!frame) return null;
  } else if (frame.xywh !== xywh) {
    doc.updateBlock(frame, { xywh });
  }

  return frame;
}

export function listPageIllustrationBrushes(doc: Store): BrushElementModel[] {
  const surface = getDocSurface(doc);
  const frame = findPageIllustrationFrame(doc);
  if (!surface || !frame) return [];

  const brushes: BrushElementModel[] = [];
  for (const id of frame.childIds) {
    const el = surface.getElementById(id);
    if (el instanceof BrushElementModel) {
      brushes.push(el);
    }
  }
  return brushes;
}

export function addPageIllustrationBrush(
  doc: Store,
  points: number[][],
  options: {
    color: string;
    lineWidth: number;
    streamline?: number;
  }
): string | null {
  const surface = getDocSurface(doc);
  if (!surface || points.length === 0) return null;

  const frame =
    findPageIllustrationFrame(doc) ??
    ensurePageIllustrationFrame(doc, { width: 800, height: 1200 });
  if (!frame) return null;

  doc.captureSync();
  const id = surface.addElement({
    type: 'brush',
    points,
    color: options.color,
    lineWidth: options.lineWidth,
    streamline: options.streamline ?? 0.5,
    // Keep strokes out of the edgeless canvas painter.
    hidden: true,
  });

  const element = surface.getElementById(id) as GfxPrimitiveElementModel | null;
  if (element) {
    frame.addChild(element);
  }
  return id;
}

export function deletePageIllustrationBrush(doc: Store, id: string) {
  const surface = getDocSurface(doc);
  const frame = findPageIllustrationFrame(doc);
  if (!surface) return;

  const element = surface.getElementById(id);
  if (!element) return;

  doc.captureSync();
  if (frame?.hasChild(element)) {
    // FrameBlockModel API (not DOM); oxlint unicorn/prefer-dom-node-remove false positive.
    // oxlint-disable-next-line unicorn/prefer-dom-node-remove
    frame.removeChildren([element]);
  }
  surface.deleteElement(id);
}

/**
 * Legacy migration: brushes drawn while illustration incorrectly used edgeless
 * are not auto-moved (cannot distinguish intentional whiteboard ink).
 * New illustration strokes always use the dedicated hidden frame.
 */
export function migrateLegacyIllustrationStrokes(_doc: Store): number {
  return 0;
}
