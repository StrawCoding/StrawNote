import { describe, expect, it, vi } from 'vitest';

import { shouldUseEdgelessMobileInkChrome } from './edgeless-mobile-ink-visibility';

describe('shouldUseEdgelessMobileInkChrome', () => {
  it('shows ink chrome for mobile edgeless editing', () => {
    vi.stubGlobal('BUILD_CONFIG', { isMobileEdition: true });
    expect(shouldUseEdgelessMobileInkChrome('edgeless', false)).toBe(true);
    expect(shouldUseEdgelessMobileInkChrome('edgeless', true)).toBe(false);
    expect(shouldUseEdgelessMobileInkChrome('page', false)).toBe(false);
    expect(shouldUseEdgelessMobileInkChrome('illustration', false)).toBe(false);
    vi.unstubAllGlobals();
  });
});
