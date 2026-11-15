import { style } from '@vanilla-extract/css';

export const footer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  marginTop: 16,
});

export const secondaryRow = style({
  display: 'flex',
  gap: 8,
  width: '100%',
});

export const secondaryBtn = style({
  flex: 1,
});

export const primaryBtn = style({
  width: '100%',
});

export const versionLine = style({
  margin: 0,
  color: 'var(--affine-text-secondary-color)',
  fontSize: 13,
  lineHeight: '18px',
});
