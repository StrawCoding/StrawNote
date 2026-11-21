import { describe, expect, it } from 'vitest';

import { installUrlCanParsePolyfill } from './url-can-parse';

describe('URL.canParse polyfill', () => {
  it('adds canParse when missing and parses like the modern API', () => {
    class FakeURL {
      constructor(url: string | URL, _base?: string | URL) {
        if (String(url) === 'bad') throw new TypeError('invalid');
      }
    }
    const ctor = FakeURL as unknown as typeof URL;
    expect(typeof ctor.canParse).toBe('undefined');
    installUrlCanParsePolyfill(ctor);
    expect(ctor.canParse('https://example.com')).toBe(true);
    expect(ctor.canParse('bad')).toBe(false);
  });

  it('leaves an existing canParse implementation alone', () => {
    const original = () => false;
    class FakeURL {
      static canParse = original;
      constructor(_url: string | URL, _base?: string | URL) {}
    }
    const ctor = FakeURL as unknown as typeof URL;
    installUrlCanParsePolyfill(ctor);
    expect(ctor.canParse).toBe(original);
  });
});
