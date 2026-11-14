import { describe, expect, test } from 'vitest';

import {
  classifySpenButtonGesture,
  isEraserTip,
  isStylusEraseGesture,
  isStylusPointer,
  SPEN_BUTTON_CLICK_MS,
  spenButtonEraserAction,
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

  test('classifies short down/up as click', () => {
    const down = classifySpenButtonGesture(
      { action: 'down', pressed: true },
      { downAt: null },
      1000
    );
    expect(down.gesture).toBe('press');
    const up = classifySpenButtonGesture(
      { action: 'up', pressed: false },
      { downAt: down.nextDownAt },
      1000 + SPEN_BUTTON_CLICK_MS - 10
    );
    expect(up.gesture).toBe('click');
  });

  test('classifies long press as press then release', () => {
    const down = classifySpenButtonGesture(
      { action: 'down', pressed: true },
      { downAt: null },
      1000
    );
    const up = classifySpenButtonGesture(
      { action: 'up', pressed: false },
      { downAt: down.nextDownAt },
      1000 + SPEN_BUTTON_CLICK_MS + 50
    );
    expect(up.gesture).toBe('release');
  });

  test('spenButtonEraserAction both-mode arms hold then toggles on click', () => {
    expect(spenButtonEraserAction('press', 'both', false)).toBe('arm-hold');
    expect(spenButtonEraserAction('click', 'both', false)).toBe('toggle');
    expect(spenButtonEraserAction('release', 'both', true)).toBe('restore');
  });

  test('spenButtonEraserAction hold-mode is momentary', () => {
    expect(spenButtonEraserAction('press', 'hold', false)).toBe('force-eraser');
    expect(spenButtonEraserAction('release', 'hold', true)).toBe('restore');
  });

  test('spenButtonEraserAction toggle-mode ignores press', () => {
    expect(spenButtonEraserAction('press', 'toggle', false)).toBe(null);
    expect(spenButtonEraserAction('click', 'toggle', false)).toBe('toggle');
  });
});
