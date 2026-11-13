import { style } from '@vanilla-extract/css';

export const radioWrapper = style({
  padding: '6px 10px',
  width: '100%',
});

/** Compact 3-way switch for the page header (page / illustration / edgeless). */
export const headerRadioWrapper = style({
  display: 'flex',
  alignItems: 'center',
  maxWidth: '100%',
  overflow: 'auto',
});
