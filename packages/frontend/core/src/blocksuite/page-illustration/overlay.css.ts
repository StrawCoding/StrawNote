import { style } from '@vanilla-extract/css';

export const root = style({
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  pointerEvents: 'none',
  overflow: 'hidden',
});

export const layer = style({
  position: 'absolute',
  pointerEvents: 'auto',
  touchAction: 'none',
  // Position + size set inline to match page content box.
});

export const toolbar = style({
  position: 'absolute',
  left: '50%',
  bottom: 16,
  transform: 'translateX(-50%)',
  zIndex: 21,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  borderRadius: 12,
  background: 'var(--affine-background-overlay-panel-color, rgba(0,0,0,0.72))',
  color: 'var(--affine-text-primary-color, #fff)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
  pointerEvents: 'auto',
  width: 'fit-content',
  maxWidth: 'calc(100% - 24px)',
  flexWrap: 'wrap',
  justifyContent: 'center',
});

export const toolButton = style({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12,
  lineHeight: 1,
  cursor: 'pointer',
  minWidth: 40,
  minHeight: 36,
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

export const widthChip = style({
  appearance: 'none',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: 'inherit',
  borderRadius: 6,
  padding: '4px 6px',
  fontSize: 11,
  cursor: 'pointer',
  selectors: {
    '&[data-active="true"]': {
      background: 'rgba(255,255,255,0.22)',
    },
  },
});

export const divider = style({
  width: 1,
  alignSelf: 'stretch',
  background: 'rgba(255,255,255,0.2)',
  margin: '0 2px',
});
