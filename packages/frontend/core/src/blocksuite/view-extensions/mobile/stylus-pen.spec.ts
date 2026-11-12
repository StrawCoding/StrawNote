import { describe, expect, test } from 'vitest';

import {
  isEraserTip,
  isStylusEraseGesture,
  isStylusPointer,
  STYLUS_BUTTON_PRIMARY,
  stylusToolIntent,
} from './stylus-pen';

describe('stylus-pen helpers', () => {
  test('detects pen and eraser pointer types', () => {
    expect(isStylusPointer({ pointerType: 'pen', button: 0, buttons: 1 })).toBe(
      true
    );
    expect(
      isStylusPointer({ pointerType: 'eraser', button: 0, buttons: 1 })
    ).toBe(true);
    expect(
      isStylusPointer({ pointerType: 'touch', button: 0, buttons: 1 })
    ).toBe(false);
    expect(
      isStylusPointer({ pointerType: 'mouse', button: 0, buttons: 1 })
    ).toBe(false);
  });

  test('eraser tip is an erase gesture', () => {
    expect(isEraserTip({ pointerType: 'eraser', button: 0, buttons: 1 })).toBe(
      true
    );
    expect(
      isStylusEraseGesture({ pointerType: 'eraser', button: 0, buttons: 1 })
    ).toBe(true);
  });

  test('barrel button bits and secondary button map to erase', () => {
    expect(
      isStylusEraseGesture({
        pointerType: 'pen',
        button: 0,
        buttons: 1 | STYLUS_BUTTON_PRIMARY,
      })
    ).toBe(true);

    expect(
      isStylusEraseGesture({
        pointerType: 'pen',
        button: 2,
        buttons: 2,
      })
    ).toBe(true);

    expect(
      isStylusEraseGesture({
        pointerType: 'pen',
        button: 5,
        buttons: 1,
      })
    ).toBe(true);
  });

  test('plain pen tip is not erase', () => {
    expect(
      isStylusEraseGesture({
        pointerType: 'pen',
        button: 0,
        buttons: 1,
      })
    ).toBe(false);
  });

  test('stylusToolIntent maps tip→brush and barrel→eraser', () => {
    expect(
      stylusToolIntent({ pointerType: 'pen', button: 0, buttons: 1 })
    ).toBe('brush');

    expect(
      stylusToolIntent({
        pointerType: 'pen',
        button: 0,
        buttons: 1 | STYLUS_BUTTON_PRIMARY,
      })
    ).toBe('eraser');

    expect(
      stylusToolIntent({ pointerType: 'eraser', button: 0, buttons: 1 })
    ).toBe('eraser');

    expect(
      stylusToolIntent({ pointerType: 'touch', button: 0, buttons: 1 })
    ).toBe(null);
  });
});
