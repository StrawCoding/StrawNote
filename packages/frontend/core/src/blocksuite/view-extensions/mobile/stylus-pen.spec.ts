import { describe, expect, test } from 'vitest';

import {
  canInkWithPointer,
  classifySpenButtonGesture,
  illustrationLayerTouchAction,
  isEraserTip,
  isStylusEraseGesture,
  isStylusPointer,
  PEN_PALM_GRACE_MS,
  shouldGuardIllustrationPageHitTest,
  shouldRejectPalmTouch,
  shouldRestoreBrushAfterEraserTip,
  shouldSkipBrushToolSwitchOnStylusDown,
  SPEN_BUTTON_CLICK_MS,
  SPEN_BUTTON_EVENT,
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

  test('barrel button identity maps to erase; stylus bits alone do not', () => {
    // Android WebView often sets STYLUS_PRIMARY on plain tip — must still brush.
    expect(
      isStylusEraseGesture({
        pointerType: 'pen',
        button: 0,
        buttons: 1 | STYLUS_BUTTON_PRIMARY,
      })
    ).toBe(false);

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

  test('stylusToolIntent maps tip→brush and barrel button→eraser', () => {
    expect(
      stylusToolIntent({ pointerType: 'pen', button: 0, buttons: 1 })
    ).toBe('brush');

    expect(
      stylusToolIntent({
        pointerType: 'pen',
        button: 0,
        buttons: 1 | STYLUS_BUTTON_PRIMARY,
      })
    ).toBe('brush');

    expect(
      stylusToolIntent({
        pointerType: 'pen',
        button: 5,
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

  test('ink tools block native panning before the first pen contact', () => {
    expect(illustrationLayerTouchAction('brush', true, false)).toBe('none');
    expect(illustrationLayerTouchAction('brush', true, true)).toBe('none');
    expect(illustrationLayerTouchAction('eraser', true, false)).toBe('none');
    expect(illustrationLayerTouchAction('eraser', true, true)).toBe('none');
    expect(illustrationLayerTouchAction('eraser', false, false)).toBe('none');
    expect(illustrationLayerTouchAction('pan', true, false)).toBe('pan-y');
    expect(illustrationLayerTouchAction('brush', false, false)).toBe('none');
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

  test('SPEN_BUTTON_EVENT is stable for native bridge', () => {
    expect(SPEN_BUTTON_EVENT).toBe('strawnote:spen-button');
  });

  test('canInkWithPointer respects fingerPanOnly for brush and eraser', () => {
    expect(canInkWithPointer('pen', 'brush', true)).toBe(true);
    expect(canInkWithPointer('touch', 'brush', true)).toBe(false);
    expect(canInkWithPointer('touch', 'brush', false)).toBe(true);
    expect(canInkWithPointer('touch', 'eraser', true)).toBe(false);
    expect(canInkWithPointer('touch', 'eraser', false)).toBe(true);
    expect(canInkWithPointer('mouse', 'brush', true)).toBe(true);
    expect(canInkWithPointer('mouse', 'eraser', true)).toBe(true);
  });

  test('shouldRejectPalmTouch only for touch during pen/grace', () => {
    expect(
      shouldRejectPalmTouch({
        pointerType: 'touch',
        penActive: true,
        graceUntilMs: 0,
        nowMs: 1000,
      })
    ).toBe(true);
    expect(
      shouldRejectPalmTouch({
        pointerType: 'touch',
        penActive: false,
        graceUntilMs: 1000 + PEN_PALM_GRACE_MS,
        nowMs: 1000 + PEN_PALM_GRACE_MS - 1,
      })
    ).toBe(true);
    expect(
      shouldRejectPalmTouch({
        pointerType: 'touch',
        penActive: false,
        graceUntilMs: 0,
        nowMs: 1000,
      })
    ).toBe(false);
    expect(
      shouldRejectPalmTouch({
        pointerType: 'pen',
        penActive: true,
        graceUntilMs: 99999,
        nowMs: 0,
      })
    ).toBe(false);
  });

  test('shouldSkipBrushToolSwitchOnStylusDown avoids redundant setTool', () => {
    expect(shouldSkipBrushToolSwitchOnStylusDown('brush', 'brush')).toBe(true);
    expect(shouldSkipBrushToolSwitchOnStylusDown('highlighter', 'brush')).toBe(
      true
    );
    expect(shouldSkipBrushToolSwitchOnStylusDown('pan', 'brush')).toBe(false);
    expect(shouldSkipBrushToolSwitchOnStylusDown('brush', 'eraser')).toBe(
      false
    );
  });

  test('shouldRestoreBrushAfterEraserTip only when leaving eraser mid-stroke', () => {
    const session = { isForced: true, isSticky: false };
    expect(
      shouldRestoreBrushAfterEraserTip('eraser', 'brush', session, 1)
    ).toBe(true);
    expect(shouldRestoreBrushAfterEraserTip('brush', 'brush', session, 1)).toBe(
      false
    );
    expect(
      shouldRestoreBrushAfterEraserTip('eraser', 'brush', session, 0)
    ).toBe(false);
  });

  test('text lock defaults off and applies independently of the ink tool', () => {
    for (const tool of ['brush', 'eraser', 'pan']) {
      expect(shouldGuardIllustrationPageHitTest(tool)).toBe(false);
      expect(shouldGuardIllustrationPageHitTest(tool, false)).toBe(false);
      expect(shouldGuardIllustrationPageHitTest(tool, true)).toBe(true);
    }
  });

  test('palm rejection can be disabled even during a pen stroke or grace period', () => {
    expect(
      shouldRejectPalmTouch({
        pointerType: 'touch',
        penActive: true,
        graceUntilMs: 2000,
        nowMs: 1000,
        enabled: false,
      })
    ).toBe(false);
    expect(
      shouldRejectPalmTouch({
        pointerType: 'touch',
        penActive: false,
        graceUntilMs: 2000,
        nowMs: 1000,
        enabled: false,
      })
    ).toBe(false);
  });
});
