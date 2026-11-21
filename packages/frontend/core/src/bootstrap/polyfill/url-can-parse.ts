/**
 * Android System WebView / older Chromium builds may lack URL.canParse
 * (Chrome ≥120). Polyfill before any navigation / link-preview code runs.
 */
export function installUrlCanParsePolyfill(
  urlCtor: typeof URL = URL
): typeof URL {
  if (typeof urlCtor.canParse === 'function') return urlCtor;
  Object.defineProperty(urlCtor, 'canParse', {
    configurable: true,
    writable: true,
    value(url: string | URL, base?: string | URL) {
      try {
        // eslint-disable-next-line no-new -- intentional parse probe
        new urlCtor(url, base);
        return true;
      } catch {
        return false;
      }
    },
  });
  return urlCtor;
}

installUrlCanParsePolyfill();
