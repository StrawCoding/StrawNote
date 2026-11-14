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
  // touchAction set inline: brush/eraser = none (S Pen must not scroll).
});
