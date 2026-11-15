import { describe, expect, test } from 'vitest';

import {
  AFFINE_OFFICIAL_CLOUD_URL,
  STRAWNOTE_CLOUD_URL,
  STRAWNOTE_GITHUB_URL,
  STRAWNOTE_HOME_URL,
  STRAWNOTE_SELFHOST_CLOUD_URL,
} from './strawnote-links';

describe('AFFINE_OFFICIAL_CLOUD_URL', () => {
  test('points at upstream AFFiNE Cloud', () => {
    expect(AFFINE_OFFICIAL_CLOUD_URL).toBe('https://app.affine.pro');
  });
});

describe('STRAWNOTE_SELFHOST_CLOUD_URL', () => {
  test('documents operator self-host only', () => {
    expect(STRAWNOTE_SELFHOST_CLOUD_URL).toBe('https://affine.wastebase.xyz');
    expect(STRAWNOTE_CLOUD_URL).toBe(STRAWNOTE_SELFHOST_CLOUD_URL);
  });
});

describe('STRAWNOTE_HOME_URL', () => {
  test('points at official GitHub Pages site', () => {
    expect(STRAWNOTE_HOME_URL).toBe(
      'https://strawcoding.github.io/StrawNoteWeb/'
    );
  });
});

describe('STRAWNOTE_GITHUB_URL', () => {
  test('points at StrawCoding StrawNote repo', () => {
    expect(STRAWNOTE_GITHUB_URL).toBe(
      'https://github.com/StrawCoding/StrawNote'
    );
  });
});
