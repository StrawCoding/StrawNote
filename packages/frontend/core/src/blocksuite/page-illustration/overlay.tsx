import { EditorSettingService } from '@affine/core/modules/editor-setting';
import {
  Bound,
  getSolidStrokePoints,
  getSvgPathFromStroke,
} from '@blocksuite/affine/global/gfx';
import type { BrushElementModel } from '@blocksuite/affine/model';
import { ColorScheme, resolveColor } from '@blocksuite/affine/model';
import type { Store } from '@blocksuite/affine/store';
import {
  ColorPickerIcon,
  EraserIcon,
  HandIcon,
  PenIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  classifySpenButtonGesture,
  isStylusPointer,
  type SpenButtonDetail,
  spenButtonEraserAction,
  type SpenButtonMode,
} from '../view-extensions/mobile/stylus-pen';
import {
  PAGE_ILLUSTRATION_DEFAULT_COLOR,
  PAGE_ILLUSTRATION_DEFAULT_LINE_WIDTH,
} from './constants';
import {
  clientToPageContentPoint,
  contentLayerOffsetInOverlay,
  isNearPolyline,
  parseHexColor,
} from './coords';
import {
  addPageIllustrationBrush,
  deletePageIllustrationBrush,
  ensurePageIllustrationFrame,
  listPageIllustrationBrushes,
} from './frame';
import * as styles from './overlay.css';

const SPEN_BUTTON_EVENT = 'strawnote:spen-button';
const CUSTOM_COLORS_KEY = 'strawnote.illustration.customColors';
const PEN_GRACE_MS = 400;
const LINE_WIDTHS = [2, 4, 6, 8, 10, 12] as const;
const QUICK_COLORS = [
  '#000000',
  '#ffffff',
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#ca8a04',
  '#7c3aed',
  '#ea580c',
] as const;

type Tool = 'brush' | 'eraser' | 'pan';

type LiveStroke = {
  points: number[][];
  color: string;
  lineWidth: number;
  streamline: number;
};

type FingerPanState = {
  lastY: number;
  scroller: HTMLElement;
};

function brushAbsolutePoints(brush: BrushElementModel): [number, number][] {
  const bound = Bound.deserialize(brush.xywh);
  return (brush.points ?? []).map(([x, y]) => [x + bound.x, y + bound.y]) as [
    number,
    number,
  ][];
}

function strokePath(
  points: number[][],
  lineWidth: number,
  streamline = 0.5
): string {
  if (points.length === 0) return '';
  const stroke = getSolidStrokePoints(points, lineWidth, { streamline });
  return getSvgPathFromStroke(stroke);
}

function eraseAtPoint(doc: Store, x: number, y: number) {
  // Finger eraser needs a generous hit radius (stylus tip is precise; finger is not).
  const hit = listPageIllustrationBrushes(doc).find(brush =>
    isNearPolyline(
      [x, y],
      brushAbsolutePoints(brush),
      Math.max(28, brush.lineWidth * 4)
    )
  );
  if (hit) {
    deletePageIllustrationBrush(doc, hit.id);
    return true;
  }
  return false;
}

function loadCustomColors(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === 'string')
      .map(c => parseHexColor(c))
      .filter((c): c is string => !!c)
      .slice(0, 16);
  } catch {
    return [];
  }
}

function saveCustomColors(colors: string[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      CUSTOM_COLORS_KEY,
      JSON.stringify(colors.slice(0, 16))
    );
  } catch {
    // ignore quota / private mode
  }
}

function findIllustrationScroller(root: HTMLElement | null): HTMLElement {
  const mode = root?.closest('[data-mode="illustration"]');
  if (mode instanceof HTMLElement) return mode;
  const parent = root?.parentElement;
  if (parent instanceof HTMLElement) return parent;
  return (document.scrollingElement as HTMLElement | null) ?? document.body;
}

export function PageIllustrationOverlay({ doc }: { doc: Store }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const hexAddInputRef = useRef<HTMLInputElement>(null);
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);
  const { resolvedTheme } = useTheme();
  const colorScheme =
    resolvedTheme === 'dark' ? ColorScheme.Dark : ColorScheme.Light;

  const [tool, setTool] = useState<Tool>('brush');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [layerOffset, setLayerOffset] = useState({ left: 0, top: 0 });
  const [brushes, setBrushes] = useState<BrushElementModel[]>([]);
  const [live, setLive] = useState<LiveStroke | null>(null);
  const liveRef = useRef<LiveStroke | null>(null);
  const [customColors, setCustomColors] = useState<string[]>(() =>
    loadCustomColors()
  );
  const [addingColor, setAddingColor] = useState(false);
  const [hexDraft, setHexDraft] = useState('');
  const drawingRef = useRef(false);
  const fingerPanRef = useRef<FingerPanState | null>(null);
  const penActiveRef = useRef(false);
  const penGraceUntilRef = useRef(0);
  const toolBeforeSpenRef = useRef<Tool | null>(null);
  const spenForcedRef = useRef(false);
  const spenStickyRef = useRef(false);
  const spenDownAtRef = useRef<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const brushColor = useMemo(() => {
    try {
      return resolveColor(
        settings.brush.color,
        colorScheme,
        PAGE_ILLUSTRATION_DEFAULT_COLOR
      );
    } catch {
      return PAGE_ILLUSTRATION_DEFAULT_COLOR;
    }
  }, [colorScheme, settings.brush.color]);

  const brushLineWidth =
    settings.brush.lineWidth ?? PAGE_ILLUSTRATION_DEFAULT_LINE_WIDTH;
  const brushStreamline = settings.brush.streamline ?? 0.5;
  const fingerPanOnly = settings.stylus?.fingerPanOnly ?? true;
  const buttonMode = (settings.stylus?.buttonMode ?? 'both') as SpenButtonMode;

  const palette = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...QUICK_COLORS, ...customColors]) {
      const key = c.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [customColors]);

  const resolveContentEl = useCallback((): HTMLElement | null => {
    const host = rootRef.current?.closest('[data-affine-editor-container]');
    if (!(host instanceof HTMLElement)) {
      return rootRef.current?.parentElement ?? null;
    }
    const pageRoot = host.querySelector(
      '.affine-page-root-block-container, affine-page-root'
    );
    if (pageRoot instanceof HTMLElement) return pageRoot;
    return rootRef.current?.parentElement ?? host;
  }, []);

  const refreshBrushes = useCallback(() => {
    setBrushes([...listPageIllustrationBrushes(doc)]);
  }, [doc]);

  const syncSize = useCallback(() => {
    const el = resolveContentEl();
    const root = rootRef.current;
    if (!el || !root) return;
    const width = Math.max(el.scrollWidth, el.clientWidth);
    const height = Math.max(el.scrollHeight, el.clientHeight);
    setSize({ width, height });
    setLayerOffset(contentLayerOffsetInOverlay(el, root));
    ensurePageIllustrationFrame(doc, { width, height });
  }, [doc, resolveContentEl]);

  useEffect(() => {
    syncSize();
    refreshBrushes();

    const el = resolveContentEl();
    const root = rootRef.current;
    const ro = el ? new ResizeObserver(() => syncSize()) : null;
    if (el && ro) ro.observe(el);
    if (root && ro) ro.observe(root);

    const onScroll = () => syncSize();
    el?.addEventListener('scroll', onScroll, { passive: true });
    const viewport = root?.parentElement;
    viewport?.addEventListener('scroll', onScroll, { passive: true });

    const surfaceModel = doc.getBlocksByFlavour('affine:surface')[0]?.model as
      | {
          elementAdded: {
            subscribe: (fn: () => void) => { unsubscribe: () => void };
          };
          elementRemoved: {
            subscribe: (fn: () => void) => { unsubscribe: () => void };
          };
          elementUpdated: {
            subscribe: (fn: () => void) => { unsubscribe: () => void };
          };
        }
      | undefined;

    const subs = [
      surfaceModel?.elementAdded.subscribe(() => refreshBrushes()),
      surfaceModel?.elementRemoved.subscribe(() => refreshBrushes()),
      surfaceModel?.elementUpdated.subscribe(() => refreshBrushes()),
      doc.slots.blockUpdated.subscribe(() => refreshBrushes()),
    ].filter(Boolean) as Array<{ unsubscribe: () => void }>;

    return () => {
      ro?.disconnect();
      el?.removeEventListener('scroll', onScroll);
      viewport?.removeEventListener('scroll', onScroll);
      subs.forEach(s => s.unsubscribe());
    };
  }, [doc, refreshBrushes, resolveContentEl, syncSize]);

  const applySpenAction = useCallback(
    (action: 'force-eraser' | 'restore' | 'toggle' | 'arm-hold') => {
      const clearHold = () => {
        if (holdTimerRef.current != null) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
      };

      if (action === 'arm-hold') {
        clearHold();
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          spenStickyRef.current = false;
          if (!spenForcedRef.current) {
            toolBeforeSpenRef.current = tool === 'eraser' ? 'brush' : tool;
          }
          spenForcedRef.current = true;
          setTool('eraser');
        }, 250);
        return;
      }

      clearHold();

      if (action === 'toggle') {
        if (
          spenForcedRef.current ||
          spenStickyRef.current ||
          tool === 'eraser'
        ) {
          spenForcedRef.current = false;
          spenStickyRef.current = false;
          setTool(toolBeforeSpenRef.current ?? 'brush');
          toolBeforeSpenRef.current = null;
        } else {
          toolBeforeSpenRef.current = tool === 'eraser' ? 'brush' : tool;
          spenForcedRef.current = true;
          spenStickyRef.current = true;
          setTool('eraser');
        }
        return;
      }
      if (action === 'force-eraser') {
        if (!spenForcedRef.current) {
          toolBeforeSpenRef.current = tool === 'eraser' ? 'brush' : tool;
        }
        spenForcedRef.current = true;
        spenStickyRef.current = false;
        setTool('eraser');
        return;
      }
      // restore
      spenForcedRef.current = false;
      spenStickyRef.current = false;
      setTool(toolBeforeSpenRef.current ?? 'brush');
      toolBeforeSpenRef.current = null;
    },
    [tool]
  );

  useEffect(() => {
    const onNativeSpenButton = (event: Event) => {
      const detail = (event as CustomEvent<SpenButtonDetail>).detail ?? {};
      const { gesture, nextDownAt } = classifySpenButtonGesture(detail, {
        downAt: spenDownAtRef.current,
      });
      spenDownAtRef.current = nextDownAt;
      if (!gesture) return;
      const action = spenButtonEraserAction(
        gesture,
        buttonMode,
        spenForcedRef.current
      );
      if (action) applySpenAction(action);
    };
    window.addEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);
    return () => {
      window.removeEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);
      if (holdTimerRef.current != null) clearTimeout(holdTimerRef.current);
    };
  }, [applySpenAction, buttonMode]);

  /**
   * Brush/eraser always use touch-action:none so S Pen strokes are never
   * interpreted as page pan. Finger scroll (when fingerPanOnly) is done by
   * manually scrolling the illustration viewport.
   */
  const canDrawWithPointer = useCallback(
    (e: ReactPointerEvent, activeTool: Tool) => {
      if (isStylusPointer(e.nativeEvent) || e.pointerType === 'pen')
        return true;
      if (e.pointerType === 'eraser') return true;
      if (e.pointerType === 'mouse') return true;
      if (e.pointerType === 'touch') {
        if (activeTool === 'eraser') return true;
        return !fingerPanOnly;
      }
      return true;
    },
    [fingerPanOnly]
  );

  const isPalmRejectedTouch = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType !== 'touch') return false;
    return penActiveRef.current || Date.now() < penGraceUntilRef.current;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (tool === 'pan') return;

      const stylus = isStylusPointer(e.nativeEvent) || e.pointerType === 'pen';

      if (stylus) {
        penActiveRef.current = true;
        const scroller = findIllustrationScroller(rootRef.current);
        scroller.dataset.illustrationInk = '1';
        scroller.style.touchAction = 'none';
      } else if (
        // Palm reject only while drawing with brush — never block finger eraser.
        tool !== 'eraser' &&
        isPalmRejectedTouch(e)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Brush + fingerPanOnly: finger scrolls the page; pen draws.
      if (
        tool === 'brush' &&
        fingerPanOnly &&
        e.pointerType === 'touch' &&
        !stylus
      ) {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        fingerPanRef.current = {
          lastY: e.clientY,
          scroller: findIllustrationScroller(rootRef.current),
        };
        return;
      }

      if (!canDrawWithPointer(e, tool)) return;

      const content = resolveContentEl();
      if (!content) return;

      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic / already-captured pointers may throw; drawing can continue.
      }
      drawingRef.current = true;
      const [x, y] = clientToPageContentPoint(e.clientX, e.clientY, content);

      if (tool === 'eraser') {
        if (eraseAtPoint(doc, x, y)) refreshBrushes();
        return;
      }

      const next: LiveStroke = {
        points: [[x, y, e.pressure || 0.5]],
        color: brushColor,
        lineWidth: brushLineWidth,
        streamline: brushStreamline,
      };
      liveRef.current = next;
      setLive(next);
    },
    [
      brushColor,
      brushLineWidth,
      brushStreamline,
      canDrawWithPointer,
      doc,
      fingerPanOnly,
      isPalmRejectedTouch,
      refreshBrushes,
      resolveContentEl,
      tool,
    ]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (fingerPanRef.current) {
        e.preventDefault();
        const dy = e.clientY - fingerPanRef.current.lastY;
        fingerPanRef.current.lastY = e.clientY;
        fingerPanRef.current.scroller.scrollTop -= dy;
        return;
      }

      if (!drawingRef.current) return;
      e.preventDefault();
      const content = resolveContentEl();
      if (!content) return;
      const [x, y] = clientToPageContentPoint(e.clientX, e.clientY, content);

      if (tool === 'eraser') {
        if (eraseAtPoint(doc, x, y)) refreshBrushes();
        return;
      }
      if (tool !== 'brush') return;
      setLive(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          points: [...prev.points, [x, y, e.pressure || 0.5]],
        };
        liveRef.current = next;
        return next;
      });
    },
    [doc, refreshBrushes, resolveContentEl, tool]
  );

  const endStroke = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (fingerPanRef.current) {
        fingerPanRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        return;
      }

      if (isStylusPointer(e.nativeEvent) || e.pointerType === 'pen') {
        penActiveRef.current = false;
        penGraceUntilRef.current = Date.now() + PEN_GRACE_MS;
        const scroller = findIllustrationScroller(rootRef.current);
        delete scroller.dataset.illustrationInk;
        scroller.style.touchAction = '';
      }

      if (!drawingRef.current) return;
      drawingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (tool !== 'brush') return;

      const stroke = liveRef.current;
      liveRef.current = null;
      setLive(null);
      if (stroke && stroke.points.length > 0) {
        addPageIllustrationBrush(doc, stroke.points, {
          color: stroke.color,
          lineWidth: stroke.lineWidth,
          streamline: stroke.streamline,
        });
        refreshBrushes();
      }
    },
    [doc, refreshBrushes, tool]
  );

  const setBrushColor = useCallback(
    (color: string) => {
      editorSetting.set('brush', { color });
    },
    [editorSetting]
  );

  const addCustomColor = useCallback(
    (raw: string) => {
      const parsed = parseHexColor(raw);
      if (!parsed) return;
      setCustomColors(prev => {
        const next = [
          parsed,
          ...prev.filter(c => c.toLowerCase() !== parsed.toLowerCase()),
        ].slice(0, 16);
        saveCustomColors(next);
        return next;
      });
      setBrushColor(parsed);
      setAddingColor(false);
      setHexDraft('');
    },
    [setBrushColor]
  );

  const removeCustomColor = useCallback((color: string) => {
    setCustomColors(prev => {
      const next = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      saveCustomColors(next);
      return next;
    });
  }, []);

  const setLineWidth = useCallback(
    (lineWidth: number) => {
      editorSetting.set('brush', { lineWidth });
    },
    [editorSetting]
  );

  const rendered = useMemo(() => {
    return brushes.map(brush => {
      const abs = brushAbsolutePoints(brush);
      const d = strokePath(abs, brush.lineWidth, brush.streamline ?? 0.5);
      const color =
        typeof brush.color === 'string'
          ? brush.color
          : resolveColor(
              brush.color,
              colorScheme,
              PAGE_ILLUSTRATION_DEFAULT_COLOR
            );
      return (
        <path
          key={brush.id}
          d={d}
          fill={color}
          fillOpacity={brush.opacity ?? 1}
        />
      );
    });
  }, [brushes, colorScheme]);

  const livePath = live
    ? strokePath(live.points, live.lineWidth, live.streamline)
    : '';

  const toolbar = (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Illustration tools"
      data-testid="page-illustration-toolbar"
    >
      <button
        type="button"
        className={styles.toolButton}
        data-active={tool === 'brush'}
        data-testid="page-illustration-tool-brush"
        title="Pen"
        aria-label="Pen"
        onClick={() => setTool('brush')}
      >
        <PenIcon width={18} height={18} />
      </button>
      <button
        type="button"
        className={styles.toolButton}
        data-active={tool === 'eraser'}
        data-testid="page-illustration-tool-eraser"
        title="Eraser"
        aria-label="Eraser"
        onClick={() => setTool('eraser')}
      >
        <EraserIcon width={18} height={18} />
      </button>
      <button
        type="button"
        className={styles.toolButton}
        data-active={tool === 'pan'}
        data-testid="page-illustration-tool-pan"
        title="Scroll"
        aria-label="Scroll"
        onClick={() => setTool('pan')}
      >
        <HandIcon width={18} height={18} />
      </button>
      <div className={styles.divider} />
      {palette.map(c => {
        const isCustom = customColors.some(
          x => x.toLowerCase() === c.toLowerCase()
        );
        return (
          <button
            key={c}
            type="button"
            className={styles.colorSwatch}
            style={{ background: c }}
            data-testid={`page-illustration-color-${c.slice(1)}`}
            data-active={brushColor.toLowerCase() === c.toLowerCase()}
            aria-label={`Color ${c}`}
            title={isCustom ? `${c} (long-press to remove)` : c}
            onClick={() => setBrushColor(c)}
            onContextMenu={e => {
              if (!isCustom) return;
              e.preventDefault();
              removeCustomColor(c);
            }}
            onPointerDown={e => {
              if (!isCustom || e.pointerType === 'mouse') return;
              const target = e.currentTarget;
              const timer = window.setTimeout(() => {
                removeCustomColor(c);
              }, 550);
              const clear = () => {
                window.clearTimeout(timer);
                target.removeEventListener('pointerup', clear);
                target.removeEventListener('pointercancel', clear);
                target.removeEventListener('pointerleave', clear);
              };
              target.addEventListener('pointerup', clear);
              target.addEventListener('pointercancel', clear);
              target.addEventListener('pointerleave', clear);
            }}
          />
        );
      })}
      <button
        type="button"
        className={styles.toolButton}
        data-testid="page-illustration-add-color"
        title="Add color"
        aria-label="Add color"
        data-active={addingColor}
        onClick={() => {
          setAddingColor(v => !v);
          if (!addingColor) {
            queueMicrotask(() => hexAddInputRef.current?.focus());
          }
        }}
      >
        <PlusIcon width={18} height={18} />
      </button>
      <input
        ref={colorInputRef}
        className={styles.hiddenColorInput}
        type="color"
        value={
          brushColor.startsWith('#') && brushColor.length === 7
            ? brushColor
            : '#000000'
        }
        aria-hidden
        tabIndex={-1}
        onChange={e => addCustomColor(e.target.value)}
      />
      {addingColor ? (
        <div className={styles.addColorRow}>
          <input
            ref={hexAddInputRef}
            className={styles.hexInput}
            data-testid="page-illustration-hex"
            value={hexDraft}
            placeholder="#000000"
            aria-label="Add hex color"
            onChange={e => setHexDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomColor(hexDraft);
              } else if (e.key === 'Escape') {
                setAddingColor(false);
                setHexDraft('');
              }
            }}
          />
          <button
            type="button"
            className={styles.toolButton}
            title="Pick"
            aria-label="Pick color"
            onClick={() => colorInputRef.current?.click()}
          >
            <ColorPickerIcon width={16} height={16} />
          </button>
          <button
            type="button"
            className={styles.toolButton}
            data-testid="page-illustration-add-color-confirm"
            title="Add"
            aria-label="Confirm add color"
            onClick={() => addCustomColor(hexDraft)}
          >
            <PlusIcon width={16} height={16} />
          </button>
        </div>
      ) : null}
      <div className={styles.divider} />
      {LINE_WIDTHS.map(w => (
        <button
          key={w}
          type="button"
          className={styles.widthChip}
          data-active={brushLineWidth === w}
          data-testid={`page-illustration-width-${w}`}
          title={`Width ${w}`}
          aria-label={`Width ${w}`}
          onClick={() => setLineWidth(w)}
        >
          <span
            className={styles.widthMark}
            style={{ height: Math.max(2, Math.min(12, w)) }}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-testid="page-illustration-overlay"
    >
      {typeof document !== 'undefined'
        ? createPortal(toolbar, document.body)
        : null}
      <svg
        ref={svgRef}
        className={styles.layer}
        width={size.width || '100%'}
        height={size.height || '100%'}
        style={{
          left: layerOffset.left,
          top: layerOffset.top,
          pointerEvents: tool === 'pan' ? 'none' : 'auto',
          // Always none for brush/eraser so S Pen never becomes page scroll.
          // Finger page scroll (brush+fingerPanOnly) is handled manually.
          touchAction: tool === 'pan' ? 'pan-y' : 'none',
          cursor:
            tool === 'eraser'
              ? 'cell'
              : tool === 'brush'
                ? 'crosshair'
                : 'default',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      >
        {rendered}
        {livePath ? (
          <path
            d={livePath}
            fill={live?.color ?? PAGE_ILLUSTRATION_DEFAULT_COLOR}
          />
        ) : null}
      </svg>
    </div>
  );
}
