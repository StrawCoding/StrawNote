import { style } from '@vanilla-extract/css';

/** Viewport-fixed ink chrome (illustration; reusable for other surfaces). */
export const toolbar = style({
  position: 'fixed',
  left: '50%',
  bottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
  transform: 'translateX(-50%)',
  zIndex: 1200,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 8px',
  borderRadius: 12,
  background: 'var(--affine-background-overlay-panel-color, rgba(0,0,0,0.72))',
  color: 'var(--affine-text-primary-color, #fff)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
  pointerEvents: 'auto',
  width: 'fit-content',
  maxWidth: 'calc(100vw - 24px)',
  flexWrap: 'wrap',
  justifyContent: 'center',
});

export const toolButton = style({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  borderRadius: 8,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  width: 36,
  height: 36,
  flexShrink: 0,
  selectors: {
    '&[data-active="true"]': {
      background: 'rgba(255,255,255,0.22)',
    },
  },
});

export const colorSwatch = style({
  width: 22,
  height: 22,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.55)',
  padding: 0,
  cursor: 'pointer',
  flexShrink: 0,
  selectors: {
    '&[data-active="true"]': {
      boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
      borderColor: 'rgba(0,0,0,0.35)',
    },
  },
});

export const hexInput = style({
  width: 84,
  height: 28,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(0,0,0,0.25)',
  color: 'inherit',
  fontSize: 12,
  padding: '0 6px',
  fontFamily: 'ui-monospace, monospace',
});

export const hiddenColorInput = style({
  position: 'absolute',
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
});

export const addColorRow = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
});

export const widthChip = style({
  appearance: 'none',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: 'inherit',
  borderRadius: 6,
  padding: 0,
  cursor: 'pointer',
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  selectors: {
    '&[data-active="true"]': {
      background: 'rgba(255,255,255,0.22)',
    },
  },
});

export const widthMark = style({
  display: 'block',
  width: 14,
  borderRadius: 999,
  background: 'currentColor',
});

export const sizeOptions = style({
  display: 'inline-flex',
  gap: 4,
  alignItems: 'center',
});
export const eraserMark = style({
  border: '1px solid currentColor',
  borderRadius: '50%',
  flexShrink: 0,
});

export const divider = style({
  width: 1,
  alignSelf: 'stretch',
  background: 'rgba(255,255,255,0.2)',
  margin: '0 2px',
});
