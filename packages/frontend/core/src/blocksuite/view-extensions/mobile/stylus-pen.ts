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
  _activeTool: string,
  fingerPanOnly: boolean
): boolean {
  if (pointerType === 'pen' || pointerType === 'eraser') return true;
  if (pointerType === 'mouse') return true;
  if (pointerType === 'touch') {
    // Brush and eraser both defer to page scroll when fingerPanOnly is on;
    // only pen/mouse ink. Finger erase requires fingerPanOnly=false.
    return !fingerPanOnly;
  }
  return true;
}

/**
 * Palm rejection while stylus is active (or within grace after tip-up).
 * Applies to touch input only; callers can disable it independently of tools.
 */
export function shouldRejectPalmTouch(opts: {
  pointerType: string;
  penActive: boolean;
  graceUntilMs: number;
  nowMs?: number;
  enabled?: boolean;
}): boolean {
  if (opts.enabled === false) return false;
  if (opts.pointerType !== 'touch') return false;
  const now = opts.nowMs ?? Date.now();
  return opts.penActive || now < opts.graceUntilMs;
}

export function isEraserTip(e: StylusPointerLike): boolean {
  return e.pointerType === 'eraser';
}

/**
 * True when the stylus should ink as eraser (not brush).
 *
 * Do **not** treat `buttons` stylus bits alone while the tip is down — several
 * Android WebViews report STYLUS_PRIMARY on plain tip contact, which incorrectly
 * forced eraser and made S Pen appear unable to draw. Hover / detached barrel
 * uses {@link retainStylusButtonBridge} / native SPenPlugin instead.
 *
 * Tip+barrel while drawing is detected via Chromium `button` 2/5, or eraser tip.
 */
export function isStylusEraseGesture(e: StylusPointerLike): boolean {
  if (isEraserTip(e)) return true;
  if (e.pointerType !== 'pen') return false;

  // Chromium maps barrel to secondary (2) or pen eraser button (5)
  return e.button === 2 || e.button === 5 || (e.buttons & 2) !== 0;
}

/**
 * touch-action for the illustration ink layer.
 * Ink tools must suppress native panning before contact: changing touch-action
 * during pointerdown cannot change the browser's decision for that gesture.
 * Finger scrolling in ink tools is routed explicitly by the overlay.
 */
export function illustrationLayerTouchAction(
  tool: string,
  _fingerPanOnly: boolean,
  strokeActive: boolean
): 'none' | 'pan-y' {
  if (strokeActive) return 'none';
  if (tool === 'pan') return 'pan-y';
  return 'none';
}

export type StylusToolIntent = 'brush' | 'eraser' | null;

/** Gfx tool names that own an in-progress ink stroke — never re-`setTool` mid-drag. */
export const GFX_INK_STROKE_TOOLS = new Set(['brush', 'highlighter']);

/** Fired when the user picks a tool from mobile ink chrome (edgeless toolbar portal). */
export const INK_TOOL_PICK_EVENT = 'strawnote:ink-tool-pick';

/** After temporary eraser, switch back to brush only when still on eraser. */
export function shouldRestoreBrushAfterEraserTip(
  currentTool: string,
  intent: StylusToolIntent,
  session: { isForced: boolean; isSticky: boolean; isButtonHeld?: boolean },
  buttons: number
): boolean {
  if (intent !== 'brush' || !session.isForced || session.isSticky) return false;
  if (session.isButtonHeld) return false;
  if (buttons === 0) return false;
  return currentTool === 'eraser';
}

/** Avoid calling `setTool(Brush)` again on stylus down — that restarts BlockSuite drag. */
export function shouldSkipBrushToolSwitchOnStylusDown(
  currentTool: string,
  intent: StylusToolIntent
): boolean {
  if (intent === 'eraser') return false;
  return GFX_INK_STROKE_TOOLS.has(currentTool);
}

/** Whether to block page / title hit-testing under illustration ink. */
export function shouldGuardIllustrationPageHitTest(
  _tool: string,
  textLock = false
): boolean {
  return textLock;
}

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
    // A duplicate/up-only report must not undo an already completed toggle.
    if (downAt == null) return { gesture: null, nextDownAt };
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
