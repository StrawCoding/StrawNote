const STORAGE_KEY = 'strawnote.app-update.prefs.v1';

export type AppUpdatePrefs = {
  /** Do not prompt again for this exact latestVersion. */
  ignoredVersion?: string;
  /** Unix ms; suppress prompts until this time. */
  snoozeUntilMs?: number;
};

const memoryStore = new Map<string, string>();

function readRaw(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return memoryStore.get(STORAGE_KEY) ?? null;
}

function writeRaw(value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value);
      return;
    }
  } catch {
    // fall through to memory
  }
  memoryStore.set(STORAGE_KEY, value);
}

function clearRaw(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  memoryStore.delete(STORAGE_KEY);
}

/** Test helper */
export function resetAppUpdatePrefsForTests(): void {
  clearRaw();
}

export function readAppUpdatePrefs(): AppUpdatePrefs {
  try {
    const raw = readRaw();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AppUpdatePrefs;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAppUpdatePrefs(next: AppUpdatePrefs): void {
  writeRaw(JSON.stringify(next));
}

export function ignoreAppUpdateVersion(version: string): void {
  const prefs = readAppUpdatePrefs();
  writeAppUpdatePrefs({
    ...prefs,
    ignoredVersion: String(version).trim(),
  });
}

/** Remind later: hide for `durationMs` (default 24h). */
export function snoozeAppUpdate(durationMs = 24 * 60 * 60 * 1000): void {
  const prefs = readAppUpdatePrefs();
  writeAppUpdatePrefs({
    ...prefs,
    snoozeUntilMs: Date.now() + durationMs,
  });
}

export function shouldSuppressAppUpdatePrompt(
  latestVersion: string,
  nowMs = Date.now()
): boolean {
  const prefs = readAppUpdatePrefs();
  const latest = String(latestVersion).trim();
  if (prefs.ignoredVersion && prefs.ignoredVersion === latest) {
    return true;
  }
  if (
    typeof prefs.snoozeUntilMs === 'number' &&
    Number.isFinite(prefs.snoozeUntilMs) &&
    prefs.snoozeUntilMs > nowMs
  ) {
    return true;
  }
  return false;
}
