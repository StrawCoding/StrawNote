import {
  ColorPickerIcon,
  EraserIcon,
  HandIcon,
  PenIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  loadStylusCustomColors,
  mergeStylusPalette,
  parseStylusHexColor,
  saveStylusCustomColors,
  STYLUS_LINE_WIDTHS,
} from './stylus-ink-palette';
import * as styles from './stylus-ink-toolbar.css';

export type StylusInkTool = 'brush' | 'eraser' | 'pan';

export type StylusInkToolbarProps = {
  tool: StylusInkTool;
  onToolChange: (tool: StylusInkTool) => void;
  brushColor: string;
  onBrushColorChange: (color: string) => void;
  brushLineWidth: number;
  onBrushLineWidthChange: (width: number) => void;
  /** data-testid prefix, default page-illustration */
  testIdPrefix?: string;
  ariaLabel?: string;
  showPan?: boolean;
};

/**
 * Shared fixed ink toolbar (Pen / Eraser / [Hand] + swatches + widths).
 * Used by page illustration; edgeless keeps BlockSuite chrome but shares
 * palette constants + editorSetting brush prefs via the same helpers.
 */
export function StylusInkToolbar({
  tool,
  onToolChange,
  brushColor,
  onBrushColorChange,
  brushLineWidth,
  onBrushLineWidthChange,
  testIdPrefix = 'page-illustration',
  ariaLabel = 'Ink tools',
  showPan = true,
}: StylusInkToolbarProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const hexAddInputRef = useRef<HTMLInputElement>(null);
  const [customColors, setCustomColors] = useState<string[]>(() =>
    loadStylusCustomColors()
  );
  const [addingColor, setAddingColor] = useState(false);
  const [hexDraft, setHexDraft] = useState('');

  const palette = useMemo(
    () => mergeStylusPalette(customColors),
    [customColors]
  );

  useEffect(() => {
    if (addingColor) {
      queueMicrotask(() => hexAddInputRef.current?.focus());
    }
  }, [addingColor]);

  const addCustomColor = useCallback(
    (raw: string) => {
      const parsed = parseStylusHexColor(raw);
      if (!parsed) return;
      setCustomColors(prev => {
        const next = [
          parsed,
          ...prev.filter(c => c.toLowerCase() !== parsed.toLowerCase()),
        ].slice(0, 16);
        saveStylusCustomColors(next);
        return next;
      });
      onBrushColorChange(parsed);
      setAddingColor(false);
      setHexDraft('');
    },
    [onBrushColorChange]
  );

  const removeCustomColor = useCallback((color: string) => {
    setCustomColors(prev => {
      const next = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      saveStylusCustomColors(next);
      return next;
    });
  }, []);

  const tid = (suffix: string) => `${testIdPrefix}-${suffix}`;

  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label={ariaLabel}
      data-testid={tid('toolbar')}
    >
      <button
        type="button"
        className={styles.toolButton}
        data-active={tool === 'brush'}
        data-testid={tid('tool-brush')}
        title="Pen"
        aria-label="Pen"
        onClick={() => onToolChange('brush')}
      >
        <PenIcon width={18} height={18} />
      </button>
      <button
        type="button"
        className={styles.toolButton}
        data-active={tool === 'eraser'}
        data-testid={tid('tool-eraser')}
        title="Eraser"
        aria-label="Eraser"
        onClick={() => onToolChange('eraser')}
      >
        <EraserIcon width={18} height={18} />
      </button>
      {showPan ? (
        <button
          type="button"
          className={styles.toolButton}
          data-active={tool === 'pan'}
          data-testid={tid('tool-pan')}
          title="Scroll"
          aria-label="Scroll"
          onClick={() => onToolChange('pan')}
        >
          <HandIcon width={18} height={18} />
        </button>
      ) : null}
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
            data-testid={tid(`color-${c.slice(1)}`)}
            data-active={brushColor.toLowerCase() === c.toLowerCase()}
            aria-label={`Color ${c}`}
            title={isCustom ? `${c} (long-press to remove)` : c}
            onClick={() => onBrushColorChange(c)}
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
        data-testid={tid('add-color')}
        title="Add color"
        aria-label="Add color"
        data-active={addingColor}
        onClick={() => setAddingColor(v => !v)}
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
            data-testid={tid('hex')}
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
            data-testid={tid('add-color-confirm')}
            title="Add"
            aria-label="Confirm add color"
            onClick={() => addCustomColor(hexDraft)}
          >
            <PlusIcon width={16} height={16} />
          </button>
        </div>
      ) : null}
      <div className={styles.divider} />
      {STYLUS_LINE_WIDTHS.map(w => (
        <button
          key={w}
          type="button"
          className={styles.widthChip}
          data-active={brushLineWidth === w}
          data-testid={tid(`width-${w}`)}
          title={`Width ${w}`}
          aria-label={`Width ${w}`}
          onClick={() => onBrushLineWidthChange(w)}
        >
          <span
            className={styles.widthMark}
            style={{ height: Math.max(2, Math.min(12, w)) }}
          />
        </button>
      ))}
    </div>
  );
}
