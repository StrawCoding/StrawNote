/**
 * StrawNote stylus / S Pen helpers.
 *
 * Android WebView + Chromium typically report:
 * - tip contact: pointerType=pen, button=0, buttons=1
 * - barrel / side button: buttons bit 32 (STYLUS_PRIMARY) and/or button=2
 * - eraser tip: pointerType=eraser
 */

/** Android MotionEvent.BUTTON_STYLUS_PRIMARY → often mirrored in PointerEvent.buttons */
export const STYLUS_BUTTON_PRIMARY = 1 << 5; // 32
/** Android MotionEvent.BUTTON_STYLUS_SECONDARY */
export const STYLUS_BUTTON_SECONDARY = 1 << 6; // 64

export type StylusPointerLike = Pick<
  PointerEvent,
  'pointerType' | 'button' | 'buttons'
>;

export function isStylusPointer(e: StylusPointerLike): boolean {
  return e.pointerType === 'pen' || e.pointerType === 'eraser';
}

export function isEraserTip(e: StylusPointerLike): boolean {
  return e.pointerType === 'eraser';
}

/**
 * True when the stylus side/barrel button is held, or the eraser tip is used.
 * Used to map S Pen button → eraser tool.
 */
export function isStylusEraseGesture(e: StylusPointerLike): boolean {
  if (isEraserTip(e)) return true;
  if (e.pointerType !== 'pen') return false;

  if (
    (e.buttons & STYLUS_BUTTON_PRIMARY) !== 0 ||
    (e.buttons & STYLUS_BUTTON_SECONDARY) !== 0
  ) {
    return true;
  }

  // Chromium often maps barrel to secondary mouse button (2) or button index 5
  return e.button === 2 || e.button === 5;
}

export type StylusToolIntent = 'brush' | 'eraser' | null;

/**
 * Decide which edgeless tool a stylus pointerdown should activate.
 * Returns null when the event is not a stylus tip (e.g. touch/mouse).
 */
export function stylusToolIntent(
  e: StylusPointerLike,
  options?: { autoBrushOnPen?: boolean }
): StylusToolIntent {
  if (!isStylusPointer(e)) return null;
  if (isStylusEraseGesture(e)) return 'eraser';
  if (options?.autoBrushOnPen === false) return null;
  return 'brush';
}
