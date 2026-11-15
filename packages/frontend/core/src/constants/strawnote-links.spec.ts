import { describe, expect, test } from 'vitest';

import { STRAWNOTE_CLOUD_URL, STRAWNOTE_HOME_URL } from './strawnote-links';

describe('STRAWNOTE_CLOUD_URL', () => {
  test('defaults to StrawNote self-hosted cloud', () => {
    expect(STRAWNOTE_CLOUD_URL).toBe('https://affine.wastebase.xyz');
  });
});

describe('STRAWNOTE_HOME_URL', () => {
  test('points at official GitHub Pages site', () => {
    expect(STRAWNOTE_HOME_URL).toBe(
      'https://strawcoding.github.io/StrawNoteWeb/'
    );
  });
});
