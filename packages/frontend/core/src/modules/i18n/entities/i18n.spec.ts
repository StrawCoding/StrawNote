/** @vitest-environment happy-dom */
import { describe, expect, test } from 'vitest';

import { mapLanguageInfo } from './i18n';

describe('mapLanguageInfo', () => {
  test('marks RTL languages', () => {
    expect(mapLanguageInfo('ar').rtl).toBe(true);
    expect(mapLanguageInfo('fa').rtl).toBe(true);
    expect(mapLanguageInfo('ur').rtl).toBe(true);
  });

  test('marks LTR languages', () => {
    expect(mapLanguageInfo('en').rtl).toBe(false);
    expect(mapLanguageInfo('fr').rtl).toBe(false);
  });

  test('defaults to Traditional Chinese when language is undefined', () => {
    const info = mapLanguageInfo();
    expect(info.key).toBe('zh-Hant');
    expect(info.rtl).toBe(false);
  });
});
