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
  // touchAction set inline via illustrationLayerTouchAction:
  // brush+fingerPanOnly → pan-y (web scroll); pen stroke → none.
});
