import {
  SPEN_BUTTON_EVENT,
  STYLUS_BUTTON_PRIMARY,
  STYLUS_BUTTON_SECONDARY,
} from './stylus-pen';

/**
 * True when the stylus barrel / side button is held (not eraser tip).
 * Tip contact uses buttons bit 0; barrel uses bits 5/6 or Chromium button 2/5.
 */
export function isStylusBarrelPressed(
  e: Pick<PointerEvent, 'pointerType' | 'button' | 'buttons' | 'type'>
): boolean {
  if (e.pointerType !== 'pen') return false;

  if (
    (e.buttons & STYLUS_BUTTON_PRIMARY) !== 0 ||
    (e.buttons & STYLUS_BUTTON_SECONDARY) !== 0
  ) {
    return true;
  }

  // Chromium often reports barrel as button 2 or 5 on the edge event.
  if (e.button === 2 || e.button === 5) {
    if (e.type === 'pointerup' || e.type === 'pointercancel') return false;
    if (e.type === 'pointerdown') return true;
  }

  return false;
}

/** Tip in contact (primary button bit). */
export function isStylusTipDown(
  e: Pick<PointerEvent, 'pointerType' | 'buttons'>
): boolean {
  return e.pointerType === 'pen' && (e.buttons & 1) !== 0;
}

function dispatchSpenButton(pressed: boolean) {
  window.dispatchEvent(
    new CustomEvent(SPEN_BUTTON_EVENT, {
      detail: {
        action: pressed ? 'down' : 'up',
        pressed,
      },
    })
  );
}

type BridgeState = {
  barrelDown: boolean;
  uninstall: (() => void) | null;
  refCount: number;
};

const state: BridgeState = {
  barrelDown: false,
  uninstall: null,
  refCount: 0,
};

/**
 * Synthesize `strawnote:spen-button` from web PointerEvents so S Pen side
 * button works in browsers without the Android Capacitor plugin.
 *
 * - Hover / detached barrel (tip up) → dispatch down/up for toggle/hold modes
 * - Tip+barrel while drawing stays on stylusToolIntent path (no double fire)
 * - Keyboard StylusPrimaryButton / StylusSecondaryButton when exposed
 *
 * Idempotent retain/release — safe from edgeless controller + illustration.
 */
function shouldInstallWebBridge(): boolean {
  if (typeof window === 'undefined') return false;
  // Android Capacitor already has SPenPlugin — dual bridges sticky-toggle eraser
  // and can leave the tool stuck so S Pen never draws.
  try {
    if (BUILD_CONFIG.isNative || BUILD_CONFIG.isAndroid) return false;
  } catch {
    // BUILD_CONFIG missing in some unit tests
  }
  const cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (cap?.isNativePlatform?.()) return false;
  return true;
}

export function retainStylusButtonBridge(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (!shouldInstallWebBridge()) {
    return () => {};
  }

  if (state.refCount === 0) {
    state.uninstall = installBridge();
  }
  state.refCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.refCount = Math.max(0, state.refCount - 1);
    if (state.refCount === 0 && state.uninstall) {
      state.uninstall();
      state.uninstall = null;
      state.barrelDown = false;
    }
  };
}

function installBridge(): () => void {
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== 'pen') return;

    const tipDown = isStylusTipDown(event);
    const barrel = isStylusBarrelPressed(event);

    // Tip+barrel: StylusPenController / illustration use stylusToolIntent.
    // Only synthesize the detached/hover button stream when tip is up.
    if (tipDown) {
      state.barrelDown = barrel;
      return;
    }

    if (barrel === state.barrelDown) return;
    state.barrelDown = barrel;
    dispatchSpenButton(barrel);
  };

  const onKey = (event: KeyboardEvent) => {
    const code = event.code || event.key;
    const isStylusKey =
      code === 'StylusPrimaryButton' ||
      code === 'StylusSecondaryButton' ||
      // Some Chromium builds expose these as key values.
      event.key === 'StylusPrimaryButton' ||
      event.key === 'StylusSecondaryButton';
    if (!isStylusKey) return;

    const pressed = event.type === 'keydown';
    if (pressed && event.repeat) return;
    if (pressed === state.barrelDown) return;
    state.barrelDown = pressed;
    dispatchSpenButton(pressed);
    event.preventDefault();
  };

  window.addEventListener('pointerdown', onPointer, true);
  window.addEventListener('pointermove', onPointer, true);
  window.addEventListener('pointerup', onPointer, true);
  window.addEventListener('pointercancel', onPointer, true);
  // Hover moves (pen near screen without tip contact)
  window.addEventListener('pointerrawupdate', onPointer as EventListener, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);

  return () => {
    window.removeEventListener('pointerdown', onPointer, true);
    window.removeEventListener('pointermove', onPointer, true);
    window.removeEventListener('pointerup', onPointer, true);
    window.removeEventListener('pointercancel', onPointer, true);
    window.removeEventListener(
      'pointerrawupdate',
      onPointer as EventListener,
      true
    );
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
  };
}

/** Test helper — reset retain count between unit tests. */
export function __resetStylusButtonBridgeForTests() {
  state.uninstall?.();
  state.uninstall = null;
  state.refCount = 0;
  state.barrelDown = false;
}
