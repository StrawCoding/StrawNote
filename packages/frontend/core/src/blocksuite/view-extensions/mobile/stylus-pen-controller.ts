import { DefaultTool } from '@blocksuite/affine/blocks/surface';
import {
  BrushTool,
  EraserTool,
  HighlighterTool,
} from '@blocksuite/affine/gfx/brush';
import { DisposableGroup } from '@blocksuite/affine/global/disposable';
import { EditorSettingProvider } from '@blocksuite/affine/shared/services';
import { type BlockStdScope, LifeCycleWatcher } from '@blocksuite/affine/std';
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx';

import {
  classifySpenButtonGesture,
  isStylusPointer,
  SPEN_BUTTON_CLICK_MS,
  type SpenButtonDetail,
  spenButtonEraserAction,
  type SpenButtonMode,
  type StylusToolIntent,
  stylusToolIntent,
} from './stylus-pen';

const SPEN_BUTTON_EVENT = 'strawnote:spen-button';

/**
 * Enables S Pen / stylus drawing on edgeless canvas (Web, desktop, Android):
 * - pen tip → brush (when on default tool or after side-button erase)
 * - barrel / eraser tip → eraser
 * - palm rejection while stylus is active
 * - native detached S Pen button via `strawnote:spen-button`
 *
 * Page illustration mode listens to the same event inside PageIllustrationOverlay.
 */
export class StylusPenController extends LifeCycleWatcher {
  static override key = 'strawnote-stylus-pen';

  private readonly _disposables = new DisposableGroup();

  private _penActive = false;

  private _toolBeforeStylusErase: string | null = null;

  private _stylusForcedEraser = false;

  /** Sticky eraser from side-button click; survives tip-up */
  private _stickyButtonEraser = false;

  private _spenDownAt: number | null = null;

  private _holdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(std: BlockStdScope) {
    super(std);
  }

  private _clearHoldTimer() {
    if (this._holdTimer != null) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  }

  private get gfx() {
    try {
      return this.std.get(GfxControllerIdentifier);
    } catch {
      return null;
    }
  }

  private getStylusPrefs(): {
    buttonMode: SpenButtonMode;
    fingerPanOnly: boolean;
  } {
    try {
      const setting = this.std.get(EditorSettingProvider);
      const stylus = (
        setting.setting$.value as {
          stylus?: { buttonMode?: SpenButtonMode; fingerPanOnly?: boolean };
        }
      ).stylus;
      return {
        buttonMode: stylus?.buttonMode ?? 'both',
        fingerPanOnly: stylus?.fingerPanOnly ?? true,
      };
    } catch {
      return { buttonMode: 'both', fingerPanOnly: true };
    }
  }

  override mounted() {
    const host = this.std.host;
    if (!host) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!isStylusPointer(event)) {
        if (
          this.getStylusPrefs().fingerPanOnly &&
          event.pointerType === 'touch' &&
          this.gfx?.tool.currentToolName$.peek() === 'brush'
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      this._penActive = true;
      const intent = stylusToolIntent(event, { autoBrushOnPen: true });
      this._applyStylusIntent(intent);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isStylusPointer(event) || !this._penActive) return;

      const intent = stylusToolIntent(event, { autoBrushOnPen: true });
      if (intent === 'eraser' && !this._stylusForcedEraser) {
        this._stickyButtonEraser = false;
        this._applyStylusIntent('eraser');
      } else if (
        intent === 'brush' &&
        this._stylusForcedEraser &&
        !this._stickyButtonEraser &&
        event.buttons !== 0
      ) {
        this._restoreAfterStylusErase();
        this._ensureTool('brush');
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!isStylusPointer(event)) return;
      this._penActive = false;
      // Sticky side-button eraser stays; momentary barrel/hold restores
      if (this._stylusForcedEraser && !this._stickyButtonEraser) {
        this._restoreAfterStylusErase();
      }
    };

    const rejectPalm = (event: TouchEvent) => {
      if (!this._penActive) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onNativeSpenButton = (event: Event) => {
      const detail = (event as CustomEvent<SpenButtonDetail>).detail ?? {};
      const { gesture, nextDownAt } = classifySpenButtonGesture(detail, {
        downAt: this._spenDownAt,
      });
      this._spenDownAt = nextDownAt;
      if (!gesture) return;

      const action = spenButtonEraserAction(
        gesture,
        this.getStylusPrefs().buttonMode,
        this._stylusForcedEraser
      );

      if (action === 'arm-hold') {
        this._clearHoldTimer();
        this._holdTimer = setTimeout(() => {
          this._holdTimer = null;
          this._stickyButtonEraser = false;
          this._applyStylusIntent('eraser');
        }, SPEN_BUTTON_CLICK_MS);
        return;
      }

      this._clearHoldTimer();

      if (action === 'force-eraser') {
        this._stickyButtonEraser = false;
        this._applyStylusIntent('eraser');
      } else if (action === 'restore') {
        this._stickyButtonEraser = false;
        this._restoreAfterStylusErase();
      } else if (action === 'toggle') {
        if (this._stylusForcedEraser || this._stickyButtonEraser) {
          this._stickyButtonEraser = false;
          this._restoreAfterStylusErase();
        } else {
          this._applyStylusIntent('eraser');
          this._stickyButtonEraser = true;
        }
      }
    };

    host.addEventListener('pointerdown', onPointerDown, true);
    host.addEventListener('pointermove', onPointerMove, true);
    host.addEventListener('pointerup', onPointerEnd, true);
    host.addEventListener('pointercancel', onPointerEnd, true);
    host.addEventListener('touchstart', rejectPalm, {
      capture: true,
      passive: false,
    });
    host.addEventListener('touchmove', rejectPalm, {
      capture: true,
      passive: false,
    });
    window.addEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);

    this._disposables.add(() => {
      this._clearHoldTimer();
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('pointermove', onPointerMove, true);
      host.removeEventListener('pointerup', onPointerEnd, true);
      host.removeEventListener('pointercancel', onPointerEnd, true);
      host.removeEventListener('touchstart', rejectPalm, true);
      host.removeEventListener('touchmove', rejectPalm, true);
      window.removeEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);
    });
  }

  override unmounted() {
    this._disposables.dispose();
  }

  private _applyStylusIntent(intent: StylusToolIntent) {
    if (!intent) return;
    const gfx = this.gfx;
    if (!gfx) return;

    const current = gfx.tool.currentToolName$.peek();

    if (intent === 'eraser') {
      if (current !== 'eraser') {
        this._toolBeforeStylusErase = current;
        this._stylusForcedEraser = true;
        gfx.tool.setTool(EraserTool);
      } else {
        this._stylusForcedEraser = true;
      }
      return;
    }

    if (current === 'default' || current === DefaultTool.toolName) {
      gfx.tool.setTool(BrushTool);
      return;
    }

    if (this._stylusForcedEraser && !this._stickyButtonEraser) {
      this._restoreAfterStylusErase();
    }

    if (current === 'eraser' && this._toolBeforeStylusErase === null) {
      return;
    }

    if (current !== 'brush' && current !== 'highlighter') {
      gfx.tool.setTool(BrushTool);
    }
  }

  private _ensureTool(kind: 'brush' | 'eraser') {
    const gfx = this.gfx;
    if (!gfx) return;
    if (kind === 'eraser') {
      gfx.tool.setTool(EraserTool);
    } else {
      gfx.tool.setTool(BrushTool);
    }
  }

  private _restoreAfterStylusErase() {
    const gfx = this.gfx;
    const previous = this._toolBeforeStylusErase;
    this._stylusForcedEraser = false;
    this._stickyButtonEraser = false;
    this._toolBeforeStylusErase = null;
    if (!gfx) return;

    if (previous === 'highlighter') {
      gfx.tool.setTool(HighlighterTool);
      return;
    }
    gfx.tool.setTool(BrushTool);
  }
}
