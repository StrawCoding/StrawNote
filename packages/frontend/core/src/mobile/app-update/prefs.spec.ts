import { afterEach, describe, expect, it } from 'vitest';

import {
  ignoreAppUpdateVersion,
  readAppUpdatePrefs,
  resetAppUpdatePrefsForTests,
  shouldSuppressAppUpdatePrompt,
  snoozeAppUpdate,
  writeAppUpdatePrefs,
} from './prefs';

describe('app update prefs', () => {
  afterEach(() => {
    resetAppUpdatePrefsForTests();
  });

  it('ignores a specific version', () => {
    ignoreAppUpdateVersion('0.28.0.12');
    expect(shouldSuppressAppUpdatePrompt('0.28.0.12')).toBe(true);
    expect(shouldSuppressAppUpdatePrompt('0.28.0.13')).toBe(false);
  });

  it('snoozes until later', () => {
    snoozeAppUpdate(60_000);
    expect(shouldSuppressAppUpdatePrompt('0.28.0.12')).toBe(true);
    expect(
      shouldSuppressAppUpdatePrompt('0.28.0.12', Date.now() + 120_000)
    ).toBe(false);
  });

  it('round-trips storage', () => {
    writeAppUpdatePrefs({ ignoredVersion: '1.0.0.1', snoozeUntilMs: 1 });
    expect(readAppUpdatePrefs()).toEqual({
      ignoredVersion: '1.0.0.1',
      snoozeUntilMs: 1,
    });
  });
});
