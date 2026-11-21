import { describe, expect, it } from 'vitest';

import {
  collectDefaultErasableTargets,
  eraserSweptHit,
  isProtectedFromDefaultEraser,
} from '../../../../../../blocksuite/affine/gfx/brush/src/eraser-erasable';

const noteBlock = { flavour: 'affine:note', xywh: '[0,0,1,1]' };
const shape = { type: 'brush', xywh: '[0,0,1,1]' };
const frame = { flavour: 'affine:frame', xywh: '[0,0,1,1]' };

describe('edgeless eraser default protect note blocks', () => {
  it('uses the selected radius for nearby geometry along the whole drag', () => {
    const dot = {
      getLineIntersections: () => null,
      getNearestPoint: () => [50, 20],
    };
    expect(eraserSweptHit(dot as never, [0, 0], [100, 0], 4)).toBe(false);
    expect(eraserSweptHit(dot as never, [0, 0], [100, 0], 24)).toBe(true);
    expect(eraserSweptHit(dot as never, [0, 0], [10, 0], 24)).toBe(false);
  });
  it('protects affine:note', () => {
    expect(isProtectedFromDefaultEraser(noteBlock as never)).toBe(true);
    expect(isProtectedFromDefaultEraser(frame as never)).toBe(false);
  });

  it('collectDefaultErasableTargets skips note cards', () => {
    const targets = collectDefaultErasableTargets(
      [shape as never],
      [noteBlock as never, frame as never]
    );
    expect(
      targets.map(
        t =>
          (t as { flavour?: string; type?: string }).flavour ??
          (t as { type?: string }).type
      )
    ).toEqual(['brush', 'affine:frame']);
  });
});
