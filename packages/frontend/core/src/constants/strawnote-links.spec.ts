import { describe, expect, test } from 'vitest';

import { STRAWNOTE_CLOUD_URL } from './strawnote-links';

describe('STRAWNOTE_CLOUD_URL', () => {
  test('defaults to StrawNote self-hosted cloud', () => {
    expect(STRAWNOTE_CLOUD_URL).toBe('https://affine.wastebase.xyz');
  });
});
