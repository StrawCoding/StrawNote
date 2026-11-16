/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { SPEN_BUTTON_EVENT, STYLUS_BUTTON_PRIMARY } from './stylus-pen';
import {
  __resetStylusButtonBridgeForTests,
  isStylusBarrelPressed,
  isStylusTipDown,
  retainStylusButtonBridge,
} from './stylus-pen-bridge';

describe('stylus-pen-bridge', () => {
  afterEach(() => {
    __resetStylusButtonBridgeForTests();
    vi.unstubAllGlobals();
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
  });

  test('detects tip and barrel bits', () => {
    expect(isStylusTipDown({ pointerType: 'pen', buttons: 1 })).toBe(true);
    expect(
      isStylusBarrelPressed({
        pointerType: 'pen',
        button: 0,
        buttons: STYLUS_BUTTON_PRIMARY,
        type: 'pointermove',
      })
    ).toBe(true);
    expect(
      isStylusBarrelPressed({
        pointerType: 'pen',
        button: 5,
        buttons: 0,
        type: 'pointerdown',
      })
    ).toBe(true);
    expect(
      isStylusBarrelPressed({
        pointerType: 'pen',
        button: 5,
        buttons: 0,
        type: 'pointerup',
      })
    ).toBe(false);
  });

  test('hover barrel synthesizes strawnote:spen-button (web path)', () => {
    const release = retainStylusButtonBridge();
    const seen: Array<{ action?: string; pressed?: boolean }> = [];
    const onEvent = (e: Event) => {
      seen.push((e as CustomEvent).detail ?? {});
    };
    window.addEventListener(SPEN_BUTTON_EVENT, onEvent);

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'pen',
        pointerId: 1,
        button: -1,
        buttons: STYLUS_BUTTON_PRIMARY,
        bubbles: true,
      })
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'pen',
        pointerId: 1,
        button: -1,
        buttons: 0,
        bubbles: true,
      })
    );

    expect(seen).toEqual([
      { action: 'down', pressed: true },
      { action: 'up', pressed: false },
    ]);

    window.removeEventListener(SPEN_BUTTON_EVENT, onEvent);
    release();
  });

  test('tip+barrel does not synthesize button event (stylusToolIntent path)', () => {
    const release = retainStylusButtonBridge();
    const onEvent = vi.fn();
    window.addEventListener(SPEN_BUTTON_EVENT, onEvent);

    window.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 1,
        button: 0,
        buttons: 1 | STYLUS_BUTTON_PRIMARY,
        bubbles: true,
      })
    );

    expect(onEvent).not.toHaveBeenCalled();
    window.removeEventListener(SPEN_BUTTON_EVENT, onEvent);
    release();
  });

  test('Android bundle previews still use browser button events', () => {
    vi.stubGlobal('BUILD_CONFIG', {
      ...BUILD_CONFIG,
      isNative: true,
      isAndroid: true,
    });
    const release = retainStylusButtonBridge();
    const onEvent = vi.fn();
    window.addEventListener(SPEN_BUTTON_EVENT, onEvent);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'StylusPrimaryButton' })
    );
    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'StylusPrimaryButton' })
    );
    expect(onEvent).toHaveBeenCalledTimes(2);
    window.removeEventListener(SPEN_BUTTON_EVENT, onEvent);
    release();
  });

  test('a native Capacitor host owns the button stream without a second web bridge', () => {
    Object.defineProperty(window, 'Capacitor', {
      configurable: true,
      value: { isNativePlatform: () => true },
    });
    const release = retainStylusButtonBridge();
    const onEvent = vi.fn();
    window.addEventListener(SPEN_BUTTON_EVENT, onEvent);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'StylusPrimaryButton' })
    );
    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'StylusPrimaryButton' })
    );
    expect(onEvent).not.toHaveBeenCalled();
    window.removeEventListener(SPEN_BUTTON_EVENT, onEvent);
    release();
  });

  test('Chromium secondary-button hover reports produce one down/up pair', () => {
    const release = retainStylusButtonBridge();
    const onEvent = vi.fn();
    window.addEventListener(SPEN_BUTTON_EVENT, onEvent);
    for (const buttons of [2, 2, 0]) {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerType: 'pen',
          pointerId: 5,
          button: -1,
          buttons,
          bubbles: true,
        })
      );
    }
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(
      onEvent.mock.calls.map(([event]) => (event as CustomEvent).detail.pressed)
    ).toEqual([true, false]);
    window.removeEventListener(SPEN_BUTTON_EVENT, onEvent);
    release();
  });
});
