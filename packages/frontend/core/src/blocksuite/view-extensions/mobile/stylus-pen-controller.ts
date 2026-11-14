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
  SPEN_BUTTON_EVENT,
  type SpenButtonDetail,
  spenButtonEraserAction,
  type SpenButtonMode,
  type StylusToolIntent,
  stylusToolIntent,
} from './stylus-pen';
import { SpenEraserSession } from './stylus-pen-session';

/**
 * Enables S Pen / stylus drawing on edgeless canvas (Web, desktop, Android):
 * - pen tip → brush (when on default tool or after side-button erase)
 * - barrel / eraser tip → eraser
 * - palm rejection while stylus is active
 * - native detached S Pen button via `strawnote:spen-button`
 *
 * Side-button eraser session is shared with page illustration via
 * {@link SpenEraserSession}.
 */
export class StylusPenController extends LifeCycleWatcher {
  static override key = 'strawnote-stylus-pen';

  private readonly _disposables = new DisposableGroup();

  private _penActive = false;

  private _session: SpenEraserSession | null = null;

  private _spenDownAt: number | null = null;

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

  private _createSession(): SpenEraserSession {
    return new SpenEraserSession({
      getCurrentTool: () => this.gfx?.tool.currentToolName$.peek() ?? 'brush',
      isEraserTool: tool => tool === 'eraser',
      defaultRestoreTool: 'brush',
      onEnterEraser: () => {
        const gfx = this.gfx;
        if (!gfx) return;
        gfx.tool.setTool(EraserTool);
      },
      onExitEraser: previous => {
        const gfx = this.gfx;
        if (!gfx) return;
        if (previous === 'highlighter') {
          gfx.tool.setTool(HighlighterTool);
          return;
        }
        gfx.tool.setTool(BrushTool);
      },
    });
  }

  override mounted() {
    const host = this.std.host;
    if (!host) return;

    this._session = this._createSession();

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
      const session = this._session;
      if (!session) return;

      if (intent === 'eraser' && !session.isForced) {
        session.enterFromStylusTip();
      } else if (
        intent === 'brush' &&
        session.isForced &&
        !session.isSticky &&
        event.buttons !== 0
      ) {
        session.onStylusTipUp();
        this._ensureTool('brush');
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!isStylusPointer(event)) return;
      this._penActive = false;
      this._session?.onStylusTipUp();
    };

    const rejectPalm = (event: TouchEvent) => {
      if (!this._penActive) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onNativeSpenButton = (event: Event) => {
      const session = this._session;
      if (!session) return;
      const detail = (event as CustomEvent<SpenButtonDetail>).detail ?? {};
      const { gesture, nextDownAt } = classifySpenButtonGesture(detail, {
        downAt: this._spenDownAt,
      });
      this._spenDownAt = nextDownAt;
      if (!gesture) return;

      const action = spenButtonEraserAction(
        gesture,
        this.getStylusPrefs().buttonMode,
        session.isForced
      );
      if (action) session.handleAction(action);
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
      this._session?.dispose();
      this._session = null;
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
    const session = this._session;
    if (!gfx || !session) return;

    const current = gfx.tool.currentToolName$.peek();

    if (intent === 'eraser') {
      session.enterFromStylusTip();
      return;
    }

    if (current === 'default' || current === DefaultTool.toolName) {
      gfx.tool.setTool(BrushTool);
      return;
    }

    if (session.isForced && !session.isSticky) {
      session.onStylusTipUp();
    }

    if (current === 'eraser' && session.previousTool === null) {
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
}
