import {
  Bound,
  getSolidStrokePoints,
  getSvgPathFromStroke,
} from '@blocksuite/affine/global/gfx';
import type { BrushElementModel } from '@blocksuite/affine/model';
import type { Store } from '@blocksuite/affine/store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PAGE_ILLUSTRATION_DEFAULT_COLOR,
  PAGE_ILLUSTRATION_DEFAULT_LINE_WIDTH,
} from './constants';
import { clientToPageContentPoint, isNearPolyline } from './coords';
import {
  addPageIllustrationBrush,
  deletePageIllustrationBrush,
  ensurePageIllustrationFrame,
  listPageIllustrationBrushes,
} from './frame';
import * as styles from './overlay.css';

type Tool = 'brush' | 'eraser' | 'pan';

type LiveStroke = {
  points: number[][];
  color: string;
  lineWidth: number;
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

export function PageIllustrationOverlay({ doc }: { doc: Store }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [brushes, setBrushes] = useState<BrushElementModel[]>([]);
  const [live, setLive] = useState<LiveStroke | null>(null);
  const drawingRef = useRef(false);

  /** Page content box: prefer BlockSuite page root container, else parent viewport. */
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
    if (!el) return;
    const width = Math.max(el.scrollWidth, el.clientWidth);
    const height = Math.max(el.scrollHeight, el.clientHeight);
    setSize({ width, height });
    ensurePageIllustrationFrame(doc, { width, height });
  }, [doc, resolveContentEl]);

  useEffect(() => {
    syncSize();
    refreshBrushes();

    const el = resolveContentEl();
    const ro = el ? new ResizeObserver(() => syncSize()) : null;
    if (el && ro) ro.observe(el);

    const onScroll = () => syncSize();
    el?.addEventListener('scroll', onScroll, { passive: true });

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
      subs.forEach(s => s.unsubscribe());
    };
  }, [doc, refreshBrushes, resolveContentEl, syncSize]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Finger / mouse pan: allow page scroll when tool is pan, or two-finger.
      if (tool === 'pan') return;
      // Touch (non-stylus) should still scroll the page.
      if (e.pointerType === 'touch' && tool === 'brush') {
        // Allow one-finger draw only with pen; finger pans the page.
        return;
      }

      const content = resolveContentEl();
      if (!content) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const [x, y] = clientToPageContentPoint(e.clientX, e.clientY, content);

      if (tool === 'eraser') {
        const hit = listPageIllustrationBrushes(doc).find(brush =>
          isNearPolyline(
            [x, y],
            brushAbsolutePoints(brush),
            Math.max(12, brush.lineWidth)
          )
        );
        if (hit) {
          deletePageIllustrationBrush(doc, hit.id);
          refreshBrushes();
        }
        return;
      }

      setLive({
        points: [[x, y, e.pressure]],
        color: PAGE_ILLUSTRATION_DEFAULT_COLOR,
        lineWidth: PAGE_ILLUSTRATION_DEFAULT_LINE_WIDTH,
      });
    },
    [doc, refreshBrushes, resolveContentEl, tool]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current || tool !== 'brush') return;
      const content = resolveContentEl();
      if (!content) return;
      const [x, y] = clientToPageContentPoint(e.clientX, e.clientY, content);
      setLive(prev =>
        prev ? { ...prev, points: [...prev.points, [x, y, e.pressure]] } : prev
      );
    },
    [resolveContentEl, tool]
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
          });
          refreshBrushes();
        }
        return null;
      });
    },
    [doc, refreshBrushes, tool]
  );

  const rendered = useMemo(() => {
    return brushes.map(brush => {
      const abs = brushAbsolutePoints(brush);
      const d = strokePath(abs, brush.lineWidth, brush.streamline ?? 0.5);
      const color =
        typeof brush.color === 'string'
          ? brush.color
          : PAGE_ILLUSTRATION_DEFAULT_COLOR;
      return (
        <path
          key={brush.id}
          d={d}
          fill={color}
          fillOpacity={brush.opacity ?? 1}
        />
      );
    });
  }, [brushes]);

  const livePath = live ? strokePath(live.points, live.lineWidth) : '';

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
      >
        <button
          type="button"
          className={styles.toolButton}
          data-active={tool === 'brush'}
          data-testid="page-illustration-tool-brush"
          onClick={() => setTool('brush')}
        >
          Pen
        </button>
        <button
          type="button"
          className={styles.toolButton}
          data-active={tool === 'eraser'}
          data-testid="page-illustration-tool-eraser"
          onClick={() => setTool('eraser')}
        >
          Eraser
        </button>
        <button
          type="button"
          className={styles.toolButton}
          data-active={tool === 'pan'}
          data-testid="page-illustration-tool-pan"
          onClick={() => setTool('pan')}
        >
          Scroll
        </button>
      </div>
      <svg
        className={styles.layer}
        width={size.width || '100%'}
        height={size.height || '100%'}
        style={{
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
