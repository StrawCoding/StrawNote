import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkForStrawNoteAppUpdate, resolveCurrentAppVersion } from './check';

describe('resolveCurrentAppVersion', () => {
  it('prefers native version', () => {
    expect(resolveCurrentAppVersion('0.28.0.1', '0.28.0.11')).toBe('0.28.0.11');
  });

  it('falls back to build config', () => {
    expect(resolveCurrentAppVersion('0.28.0.9')).toBe('0.28.0.9');
  });
});

describe('checkForStrawNoteAppUpdate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('detects newer manifest version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('app-update.json')) {
          return {
            ok: true,
            json: async () => ({
              latestVersion: '0.28.0.20',
              playUrl:
                'https://play.google.com/store/apps/details?id=com.strawcoding.strawnote',
              message: '',
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      })
    );

    const result = await checkForStrawNoteAppUpdate({
      currentVersion: '0.28.0.11',
      manifestUrls: ['https://example.test/app-update.json'],
    });

    expect(result.checkFailed).toBe(false);
    expect(result.hasUpdate).toBe(true);
    expect(result.latestVersion).toBe('0.28.0.20');
  });

  it('returns no update when already latest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ latestVersion: '0.28.0.11' }),
      }))
    );

    const result = await checkForStrawNoteAppUpdate({
      currentVersion: '0.28.0.11',
      manifestUrls: ['https://example.test/app-update.json'],
    });

    expect(result.hasUpdate).toBe(false);
    expect(result.checkFailed).toBe(false);
  });
});
