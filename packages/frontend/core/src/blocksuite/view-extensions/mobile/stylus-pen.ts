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

/** Short press threshold for detached S Pen side button (ms). */
export const SPEN_BUTTON_CLICK_MS = 250;

/** Native Android bridge event for detached S Pen side button. */
export const SPEN_BUTTON_EVENT = 'strawnote:spen-button';

/** Keep rejecting palm touches briefly after the pen lifts. */
export const PEN_PALM_GRACE_MS = 400;

export type StylusPointerLike = Pick<
  PointerEvent,
  'pointerType' | 'button' | 'buttons'
>;

export type SpenButtonMode = 'hold' | 'toggle' | 'both';

export type SpenButtonDetail = {
  pressed?: boolean;
  action?: 'down' | 'up' | 'click';
};

export type SpenButtonGesture = 'press' | 'release' | 'click';

export function isStylusPointer(e: StylusPointerLike): boolean {
  return e.pointerType === 'pen' || e.pointerType === 'eraser';
}

/**
 * Whether this pointer may ink (draw / erase) on a surface that respects
 * `fingerPanOnly`. Shared by edgeless prefs + page illustration overlay.
 */
export function canInkWithPointer(
  pointerType: string,
  activeTool: string,
  fingerPanOnly: boolean
): boolean {
  if (pointerType === 'pen' || pointerType === 'eraser') return true;
  if (pointerType === 'mouse') return true;
  if (pointerType === 'touch') {
    if (activeTool === 'eraser') return true;
    return !fingerPanOnly;
  }
  return true;
}

/**
 * Palm rejection while stylus is active (or within grace after tip-up).
 * Never used to block an intentional finger eraser swipe — callers should
 * skip this when `activeTool === 'eraser'`.
 */
export function shouldRejectPalmTouch(opts: {
  pointerType: string;
  penActive: boolean;
  graceUntilMs: number;
  nowMs?: number;
}): boolean {
  if (opts.pointerType !== 'touch') return false;
  const now = opts.nowMs ?? Date.now();
  return opts.penActive || now < opts.graceUntilMs;
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

/**
 * Classify native `strawnote:spen-button` detail into a gesture.
 * Native only emits down/up — JS synthesizes click from short presses.
 */
export function classifySpenButtonGesture(
  detail: SpenButtonDetail,
  state: { downAt: number | null },
  now = Date.now(),
  clickMs = SPEN_BUTTON_CLICK_MS
): { gesture: SpenButtonGesture | null; nextDownAt: number | null } {
  if (detail.action === 'click') {
    return { gesture: 'click', nextDownAt: null };
  }

  const pressed = detail.pressed === true || detail.action === 'down';
  const released = detail.pressed === false || detail.action === 'up';

  if (pressed) {
    return { gesture: 'press', nextDownAt: now };
  }

  if (released) {
    const downAt = state.downAt;
    const nextDownAt = null;
    if (downAt != null && now - downAt <= clickMs) {
      return { gesture: 'click', nextDownAt };
    }
    return { gesture: 'release', nextDownAt };
  }

  return { gesture: null, nextDownAt: state.downAt };
}

/**
 * Map a classified gesture + button mode to eraser intent.
 * - hold: press → eraser on; release/click → eraser off
 * - toggle: only click → sticky toggle (ignore press/release)
 * - both: click → sticky toggle; press alone does nothing (caller starts
 *   a hold timer); release after hold → restore
 */
export function spenButtonEraserAction(
  gesture: SpenButtonGesture,
  mode: SpenButtonMode,
  currentlyForcedEraser: boolean
): 'force-eraser' | 'restore' | 'toggle' | 'arm-hold' | null {
  if (mode === 'toggle') {
    if (gesture === 'click') return 'toggle';
    return null;
  }

  if (mode === 'hold') {
    if (gesture === 'press') return 'force-eraser';
    if (gesture === 'release' || gesture === 'click') {
      return currentlyForcedEraser ? 'restore' : null;
    }
    return null;
  }

  // both
  if (gesture === 'press') return 'arm-hold';
  if (gesture === 'click') return 'toggle';
  if (gesture === 'release') {
    return currentlyForcedEraser ? 'restore' : null;
  }
  return null;
}
