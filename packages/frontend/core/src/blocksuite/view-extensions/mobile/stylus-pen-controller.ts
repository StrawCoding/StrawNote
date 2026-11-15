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
  INK_TOOL_PICK_EVENT,
  isStylusPointer,
  shouldRestoreBrushAfterEraserTip,
  shouldSkipBrushToolSwitchOnStylusDown,
  SPEN_BUTTON_EVENT,
  type SpenButtonDetail,
  spenButtonEraserAction,
  type SpenButtonMode,
  type StylusToolIntent,
  stylusToolIntent,
} from './stylus-pen';
import { retainStylusButtonBridge } from './stylus-pen-bridge';
import { SpenEraserSession } from './stylus-pen-session';

/**
 * Enables S Pen / stylus drawing on edgeless canvas (Web, desktop, Android):
 * - pen tip → brush (when on default tool or after side-button erase)
 * - barrel / eraser tip → eraser
 * - palm rejection while stylus is active
 * - detached / hover S Pen button via `strawnote:spen-button`
 *   (Android Capacitor plugin + web {@link retainStylusButtonBridge})
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
    const releaseBridge = retainStylusButtonBridge();

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

      const gfx = this.gfx;
      const current = gfx?.tool.currentToolName$.peek() ?? '';
      const intent = stylusToolIntent(event, { autoBrushOnPen: true });
      const session = this._session;
      if (!session) return;

      if (shouldSkipBrushToolSwitchOnStylusDown(current, intent)) {
        if (intent === 'eraser' && !session.isForced) {
          session.enterFromStylusTip();
        }
        return;
      }

      if (intent === 'eraser' && !session.isForced) {
        session.enterFromStylusTip();
      } else if (
        shouldRestoreBrushAfterEraserTip(
          current,
          intent,
          session,
          event.buttons
        )
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

    const onInkToolPick = () => {
      this._session?.clear();
    };
    window.addEventListener(INK_TOOL_PICK_EVENT, onInkToolPick);

    this._disposables.add(() => {
      releaseBridge();
      this._session?.dispose();
      this._session = null;
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('pointermove', onPointerMove, true);
      host.removeEventListener('pointerup', onPointerEnd, true);
      host.removeEventListener('pointercancel', onPointerEnd, true);
      host.removeEventListener('touchstart', rejectPalm, true);
      host.removeEventListener('touchmove', rejectPalm, true);
      window.removeEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);
      window.removeEventListener(INK_TOOL_PICK_EVENT, onInkToolPick);
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

    if (shouldSkipBrushToolSwitchOnStylusDown(current, intent)) {
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
    const current = gfx.tool.currentToolName$.peek();
    if (kind === 'eraser') {
      if (current !== 'eraser') gfx.tool.setTool(EraserTool);
      return;
    }
    if (current !== 'brush' && current !== 'highlighter') {
      gfx.tool.setTool(BrushTool);
    }
  }
}
