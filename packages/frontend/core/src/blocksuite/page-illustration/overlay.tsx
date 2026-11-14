import { EditorSettingService } from '@affine/core/modules/editor-setting';
import {
  Bound,
  getSolidStrokePoints,
  getSvgPathFromStroke,
} from '@blocksuite/affine/global/gfx';
import type { BrushElementModel } from '@blocksuite/affine/model';
import { ColorScheme, resolveColor } from '@blocksuite/affine/model';
import type { Store } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
const LINE_WIDTHS = [2, 4, 6, 8, 10, 12] as const;
const QUICK_COLORS = [
  '#000000',
  '#ffffff',
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#ca8a04',
] as const;

type Tool = 'brush' | 'eraser' | 'pan';

type LiveStroke = {
  points: number[][];
  color: string;
  lineWidth: number;
  streamline: number;
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
  const hit = listPageIllustrationBrushes(doc).find(brush =>
    isNearPolyline(
      [x, y],
      brushAbsolutePoints(brush),
      Math.max(12, brush.lineWidth)
    )
  );
  if (hit) {
    deletePageIllustrationBrush(doc, hit.id);
    return true;
  }
  return false;
}

export function PageIllustrationOverlay({ doc }: { doc: Store }) {
  const rootRef = useRef<HTMLDivElement>(null);
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
  const [hexDraft, setHexDraft] = useState('');
  const drawingRef = useRef(false);
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

  useEffect(() => {
    setHexDraft(brushColor.startsWith('#') ? brushColor : '');
  }, [brushColor]);

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
    // Parent viewport may be the scroller
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

  const canDrawWithPointer = useCallback(
    (e: React.PointerEvent) => {
      if (isStylusPointer(e.nativeEvent) || e.pointerType === 'pen')
        return true;
      if (e.pointerType === 'eraser') return true;
      if (e.pointerType === 'mouse') return true;
      if (e.pointerType === 'touch') return !fingerPanOnly;
      return true;
    },
    [fingerPanOnly]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tool === 'pan') return;
      if (!canDrawWithPointer(e)) return;

      const content = resolveContentEl();
      if (!content) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const [x, y] = clientToPageContentPoint(e.clientX, e.clientY, content);

      if (tool === 'eraser') {
        if (eraseAtPoint(doc, x, y)) refreshBrushes();
        return;
      }

      setLive({
        points: [[x, y, e.pressure || 0.5]],
        color: brushColor,
        lineWidth: brushLineWidth,
        streamline: brushStreamline,
      });
    },
    [
      brushColor,
      brushLineWidth,
      brushStreamline,
      canDrawWithPointer,
      doc,
      refreshBrushes,
      resolveContentEl,
      tool,
    ]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      const content = resolveContentEl();
      if (!content) return;
      const [x, y] = clientToPageContentPoint(e.clientX, e.clientY, content);

      if (tool === 'eraser') {
        if (eraseAtPoint(doc, x, y)) refreshBrushes();
        return;
      }
      if (tool !== 'brush') return;
      setLive(prev =>
        prev
          ? {
              ...prev,
              points: [...prev.points, [x, y, e.pressure || 0.5]],
            }
          : prev
      );
    },
    [doc, refreshBrushes, resolveContentEl, tool]
  );

  const endStroke = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (tool !== 'brush') return;

      setLive(prev => {
        if (prev && prev.points.length > 0) {
          addPageIllustrationBrush(doc, prev.points, {
            color: prev.color,
            lineWidth: prev.lineWidth,
            streamline: prev.streamline,
          });
          refreshBrushes();
        }
        return null;
      });
    },
    [doc, refreshBrushes, tool]
  );

  const setBrushColor = useCallback(
    (color: string) => {
      editorSetting.set('brush', { color });
    },
    [editorSetting]
  );

  const commitHex = useCallback(() => {
    const parsed = parseHexColor(hexDraft);
    if (parsed) setBrushColor(parsed);
    else setHexDraft(brushColor.startsWith('#') ? brushColor : '');
  }, [brushColor, hexDraft, setBrushColor]);

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

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-testid="page-illustration-overlay"
    >
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
          onClick={() => setTool('brush')}
        >
          Pen
        </button>
        <button
          type="button"
          className={styles.toolButton}
          data-active={tool === 'eraser'}
          data-testid="page-illustration-tool-eraser"
          title="Eraser"
          onClick={() => setTool('eraser')}
        >
          Eraser
        </button>
        <button
          type="button"
          className={styles.toolButton}
          data-active={tool === 'pan'}
          data-testid="page-illustration-tool-pan"
          title="Scroll"
          onClick={() => setTool('pan')}
        >
          Scroll
        </button>
        <div className={styles.divider} />
        {QUICK_COLORS.map(c => (
          <button
            key={c}
            type="button"
            className={styles.colorSwatch}
            style={{ background: c }}
            data-testid={`page-illustration-color-${c.slice(1)}`}
            data-active={brushColor.toLowerCase() === c}
            aria-label={`Color ${c}`}
            onClick={() => setBrushColor(c)}
          />
        ))}
        <input
          className={styles.hexInput}
          data-testid="page-illustration-hex"
          value={hexDraft}
          placeholder="#000000"
          aria-label="Hex color"
          onChange={e => setHexDraft(e.target.value)}
          onBlur={commitHex}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitHex();
            }
          }}
        />
        <div className={styles.divider} />
        {LINE_WIDTHS.map(w => (
          <button
            key={w}
            type="button"
            className={styles.widthChip}
            data-active={brushLineWidth === w}
            data-testid={`page-illustration-width-${w}`}
            onClick={() => setLineWidth(w)}
          >
            {w}
          </button>
        ))}
      </div>
      <svg
        className={styles.layer}
        width={size.width || '100%'}
        height={size.height || '100%'}
        style={{
          left: layerOffset.left,
          top: layerOffset.top,
          pointerEvents: tool === 'pan' ? 'none' : 'auto',
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
