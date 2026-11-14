import { DefaultTool } from '@blocksuite/affine/blocks/surface';
import {
  BrushTool,
  EraserTool,
  HighlighterTool,
} from '@blocksuite/affine/gfx/brush';
import { DisposableGroup } from '@blocksuite/affine/global/disposable';
import { type BlockStdScope, LifeCycleWatcher } from '@blocksuite/affine/std';
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx';

import {
  isStylusPointer,
  type StylusToolIntent,
  stylusToolIntent,
} from './stylus-pen';

const SPEN_BUTTON_EVENT = 'strawnote:spen-button';

type SpenButtonDetail = {
  pressed?: boolean;
  action?: 'down' | 'up' | 'click';
};

/**
 * Enables S Pen / stylus drawing on edgeless canvas (Web, desktop, Android):
 * - pen tip → brush (when on default tool or after side-button erase)
 * - barrel / eraser tip → eraser
 * - palm rejection while stylus is active
 * - native detached S Pen button via `strawnote:spen-button`
 *
 * Page illustration mode uses PageIllustrationOverlay (pen vs finger) instead.
 */
export class StylusPenController extends LifeCycleWatcher {
  static override key = 'strawnote-stylus-pen';

  private readonly _disposables = new DisposableGroup();

  private _penActive = false;

  private _toolBeforeStylusErase: string | null = null;

  private _stylusForcedEraser = false;

  constructor(std: BlockStdScope) {
    super(std);
  }

  private get gfx() {
    try {
      return this.std.get(GfxControllerIdentifier);
    } catch {
      return null;
    }
  }

  override mounted() {
    const host = this.std.host;
    if (!host) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!isStylusPointer(event)) return;

      this._penActive = true;
      const intent = stylusToolIntent(event, { autoBrushOnPen: true });
      this._applyStylusIntent(intent, event);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isStylusPointer(event) || !this._penActive) return;

      // Mid-stroke barrel press/release: switch erase ↔ brush
      const intent = stylusToolIntent(event, { autoBrushOnPen: true });
      if (intent === 'eraser' && !this._stylusForcedEraser) {
        this._applyStylusIntent('eraser', event);
      } else if (
        intent === 'brush' &&
        this._stylusForcedEraser &&
        event.buttons !== 0
      ) {
        this._restoreAfterStylusErase();
        this._ensureTool('brush');
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!isStylusPointer(event)) return;
      this._penActive = false;
      if (this._stylusForcedEraser) {
        this._restoreAfterStylusErase();
      }
    };

    // Palm rejection: block touch scroll/pan while stylus is writing
    const rejectPalm = (event: TouchEvent) => {
      if (!this._penActive) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onNativeSpenButton = (event: Event) => {
      const detail = (event as CustomEvent<SpenButtonDetail>).detail ?? {};

      // Detached S Pen click: toggle eraser ↔ brush
      if (detail.action === 'click') {
        if (this._stylusForcedEraser) {
          this._restoreAfterStylusErase();
        } else {
          this._applyStylusIntent('eraser');
        }
        return;
      }

      const pressed = detail.pressed === true || detail.action === 'down';
      const released = detail.pressed === false || detail.action === 'up';

      if (pressed) {
        this._applyStylusIntent('eraser');
      }
      if (released && this._stylusForcedEraser) {
        this._restoreAfterStylusErase();
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

  private _applyStylusIntent(intent: StylusToolIntent, _event?: PointerEvent) {
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

    // brush
    if (current === 'default' || current === DefaultTool.toolName) {
      gfx.tool.setTool(BrushTool);
      return;
    }

    if (this._stylusForcedEraser) {
      this._restoreAfterStylusErase();
    }

    if (current === 'eraser' && this._toolBeforeStylusErase === null) {
      // User manually selected eraser; don't override mid-stroke tip-only
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
    this._toolBeforeStylusErase = null;
    if (!gfx) return;

    if (previous === 'highlighter') {
      gfx.tool.setTool(HighlighterTool);
      return;
    }
    // Prefer brush so writing can continue after side-button erase
    gfx.tool.setTool(BrushTool);
  }
}
