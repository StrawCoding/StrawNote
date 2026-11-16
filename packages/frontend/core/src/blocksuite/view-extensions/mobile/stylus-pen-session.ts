import { SPEN_BUTTON_CLICK_MS } from './stylus-pen';

export type SpenEraserAction =
  | 'force-eraser'
  | 'restore'
  | 'toggle'
  | 'arm-hold';

export type SpenEraserSessionHost = {
  /** Current ink / gfx tool name (e.g. brush, eraser, pan, highlighter). */
  getCurrentTool: () => string;
  /** True when `tool` is the eraser tool for this surface. */
  isEraserTool?: (tool: string) => boolean;
  /**
   * Tool to restore when previous was also eraser (illustration uses brush).
   * Default: `brush`.
   */
  defaultRestoreTool?: string;
  holdMs?: number;
  /** Activate eraser on the host surface. */
  onEnterEraser: (meta: {
    sticky: boolean;
    previousTool: string | null;
  }) => void;
  /** Leave eraser; `previousTool` is what the session remembered. */
  onExitEraser: (previousTool: string | null) => void;
};

/**
 * Shared S Pen side-button / barrel eraser session for edgeless + illustration.
 *
 * Owns forced / sticky / toolBefore + hold timer so both surfaces stay in sync
 * without duplicating toggle/hold/both-mode wiring.
 */
export class SpenEraserSession {
  private forced = false;
  private sticky = false;
  private buttonHeld = false;
  private toolBefore: string | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly holdMs: number;
  private readonly defaultRestoreTool: string;

  constructor(private readonly host: SpenEraserSessionHost) {
    this.holdMs = host.holdMs ?? SPEN_BUTTON_CLICK_MS;
    this.defaultRestoreTool = host.defaultRestoreTool ?? 'brush';
  }

  get isForced(): boolean {
    return this.forced;
  }

  get isSticky(): boolean {
    return this.sticky;
  }

  get isButtonHeld(): boolean {
    return this.buttonHeld;
  }

  setButtonPressed(pressed: boolean) {
    this.buttonHeld = pressed;
  }

  get previousTool(): string | null {
    return this.toolBefore;
  }

  dispose() {
    this.clearHold();
  }

  /** User picked a tool from the toolbar — drop side-button session state. */
  clear() {
    this.clearHold();
    this.forced = false;
    this.sticky = false;
    this.buttonHeld = false;
    this.toolBefore = null;
  }

  private isEraserTool(tool: string): boolean {
    return this.host.isEraserTool?.(tool) ?? tool === 'eraser';
  }

  private clearHold() {
    if (this.holdTimer != null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private rememberPreviousIfNeeded() {
    if (this.forced) return;
    const current = this.host.getCurrentTool();
    this.toolBefore = this.isEraserTool(current)
      ? this.defaultRestoreTool
      : current;
  }

  private enterEraser(sticky: boolean) {
    this.clearHold();
    this.rememberPreviousIfNeeded();
    this.forced = true;
    this.sticky = sticky;
    this.host.onEnterEraser({
      sticky,
      previousTool: this.toolBefore,
    });
  }

  private restore() {
    this.clearHold();
    const previous = this.toolBefore;
    this.forced = false;
    this.sticky = false;
    this.toolBefore = null;
    this.host.onExitEraser(previous);
  }

  /**
   * Stylus tip / barrel path (edgeless pointer move): enter momentary eraser.
   */
  enterFromStylusTip() {
    this.enterEraser(false);
  }

  /**
   * Tip-up restores only a temporary tip eraser. A physical side-button hold
   * stays active until its own release; a sticky click stays active until toggled.
   */
  onStylusTipUp() {
    if (this.forced && !this.sticky && !this.buttonHeld) {
      this.restore();
    }
  }

  handleAction(action: SpenEraserAction) {
    if (action === 'arm-hold') {
      this.clearHold();
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        this.enterEraser(false);
      }, this.holdMs);
      return;
    }

    this.clearHold();

    if (action === 'force-eraser') {
      this.enterEraser(false);
      return;
    }

    if (action === 'restore') {
      this.restore();
      return;
    }

    // toggle
    const current = this.host.getCurrentTool();
    const onEraser = this.forced || this.sticky || this.isEraserTool(current);
    if (onEraser) {
      this.restore();
    } else {
      this.enterEraser(true);
    }
  }
}
