import { globalStyle, style } from '@vanilla-extract/css';

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
  // brush/eraser+fingerPanOnly → pan-y (web scroll); pen stroke → none.
});

/** Finger may scroll but must not place caret in page blocks while inking. */
globalStyle(
  '[data-illustration-mode="true"][data-illustration-guard-page="true"] .affine-page-root-block-container',
  {
    pointerEvents: 'none',
  }
);
globalStyle(
  '[data-illustration-mode="true"][data-illustration-guard-page="true"] .doc-title-container',
  {
    pointerEvents: 'none',
  }
);
globalStyle(
  '[data-illustration-mode="true"][data-illustration-guard-page="true"] .doc-editor-gap',
  {
    pointerEvents: 'none',
  }
);
