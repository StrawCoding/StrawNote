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
  left: 0,
  top: 0,
  pointerEvents: 'auto',
  touchAction: 'none',
  // Fill is sized in JS to match page content box.
});

export const toolbar = style({
  position: 'sticky',
  top: 8,
  left: 8,
  zIndex: 21,
  display: 'inline-flex',
  gap: 4,
  padding: 4,
  borderRadius: 8,
  background: 'rgba(0,0,0,0.55)',
  color: '#fff',
  pointerEvents: 'auto',
  width: 'fit-content',
  margin: 8,
});

export const toolButton = style({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12,
  cursor: 'pointer',
  selectors: {
    '&[data-active="true"]': {
      background: 'rgba(255,255,255,0.22)',
    },
  },
});
