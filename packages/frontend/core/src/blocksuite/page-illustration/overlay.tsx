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
  type StylusInkTool,
  StylusInkToolbar,
} from '../view-extensions/mobile/stylus-ink-toolbar';
import {
  canInkWithPointer,
  classifySpenButtonGesture,
  isStylusPointer,
  PEN_PALM_GRACE_MS,
  shouldRejectPalmTouch,
  SPEN_BUTTON_EVENT,
  type SpenButtonDetail,
  spenButtonEraserAction,
  type SpenButtonMode,
} from '../view-extensions/mobile/stylus-pen';
import { SpenEraserSession } from '../view-extensions/mobile/stylus-pen-session';
import {
  PAGE_ILLUSTRATION_DEFAULT_COLOR,
  PAGE_ILLUSTRATION_DEFAULT_LINE_WIDTH,
} from './constants';
import {
  clientToPageContentPoint,
  contentLayerOffsetInOverlay,
  isNearPolyline,
} from './coords';
import {
  addPageIllustrationBrush,
  deletePageIllustrationBrush,
  ensurePageIllustrationFrame,
  listPageIllustrationBrushes,
} from './frame';
import * as styles from './overlay.css';

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
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);
  const { resolvedTheme } = useTheme();
  const colorScheme =
    resolvedTheme === 'dark' ? ColorScheme.Dark : ColorScheme.Light;

  const [tool, setTool] = useState<StylusInkTool>('brush');
  const toolRef = useRef<StylusInkTool>(tool);
  toolRef.current = tool;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [layerOffset, setLayerOffset] = useState({ left: 0, top: 0 });
  const [brushes, setBrushes] = useState<BrushElementModel[]>([]);
  const [live, setLive] = useState<LiveStroke | null>(null);
  const liveRef = useRef<LiveStroke | null>(null);
  const drawingRef = useRef(false);
  const fingerPanRef = useRef<FingerPanState | null>(null);
  const penActiveRef = useRef(false);
  const penGraceUntilRef = useRef(0);
  const spenDownAtRef = useRef<number | null>(null);
  const sessionRef = useRef<SpenEraserSession | null>(null);

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

  // Shared S Pen eraser session (same machine as edgeless StylusPenController).
  useEffect(() => {
    const session = new SpenEraserSession({
      getCurrentTool: () => toolRef.current,
      isEraserTool: t => t === 'eraser',
      defaultRestoreTool: 'brush',
      onEnterEraser: () => setTool('eraser'),
      onExitEraser: previous => {
        const next = previous as StylusInkTool | null;
        setTool(
          next === 'brush' || next === 'eraser' || next === 'pan'
            ? next
            : 'brush'
        );
      },
    });
    sessionRef.current = session;
    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, []);

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

  useEffect(() => {
    const onNativeSpenButton = (event: Event) => {
      const session = sessionRef.current;
      if (!session) return;
      const detail = (event as CustomEvent<SpenButtonDetail>).detail ?? {};
      const { gesture, nextDownAt } = classifySpenButtonGesture(detail, {
        downAt: spenDownAtRef.current,
      });
      spenDownAtRef.current = nextDownAt;
      if (!gesture) return;
      const action = spenButtonEraserAction(
        gesture,
        buttonMode,
        session.isForced
      );
      if (action) session.handleAction(action);
    };
    window.addEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);
    return () => {
      window.removeEventListener(SPEN_BUTTON_EVENT, onNativeSpenButton);
    };
  }, [buttonMode]);

  const selectTool = useCallback((next: StylusInkTool) => {
    sessionRef.current?.clear();
    setTool(next);
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
        tool !== 'eraser' &&
        shouldRejectPalmTouch({
          pointerType: e.pointerType,
          penActive: penActiveRef.current,
          graceUntilMs: penGraceUntilRef.current,
        })
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

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

      if (!canInkWithPointer(e.pointerType, tool, fingerPanOnly)) return;

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
      doc,
      fingerPanOnly,
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
        penGraceUntilRef.current = Date.now() + PEN_PALM_GRACE_MS;
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
    <StylusInkToolbar
      tool={tool}
      onToolChange={selectTool}
      brushColor={brushColor}
      onBrushColorChange={setBrushColor}
      brushLineWidth={brushLineWidth}
      onBrushLineWidthChange={setLineWidth}
      ariaLabel="Illustration tools"
      testIdPrefix="page-illustration"
    />
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
