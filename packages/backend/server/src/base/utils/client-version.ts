import semver from 'semver';

const DAY_MS = 24 * 60 * 60 * 1000;

// Example: 2026.2.6-canary.015
const CANARY_DATE_VERSION_RE =
  /^v?(\d{4})\.(\d{1,2})\.(\d{1,2})-canary\.(\d+)(?:\+.*)?$/i;

export const CANARY_CLIENT_VERSION_MAX_AGE_DAYS = 62; // ~2 months
export const CANARY_CLIENT_VERSION_MAX_FUTURE_SKEW_DAYS = 2;

export type CanaryDateClientVersion = {
  raw: string;
  normalized: string;
  dateMs: number;
};

export function parseCanaryDateClientVersion(
  version: string
): CanaryDateClientVersion | null {
  const raw = version.trim();
  const match = CANARY_DATE_VERSION_RE.exec(raw);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const build = match[4].replace(/^0+(?=\d)/, '');

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 0 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const dateMs = Date.UTC(year, month - 1, day);
  const date = new Date(dateMs);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    raw,
    normalized: `${year}.${month}.${day}-canary.${build}`,
    dateMs,
  };
}

export type CanaryClientVersionCheckResult =
  | { matched: false }
  | { matched: true; allowed: boolean; normalized: string };

export function checkCanaryDateClientVersion(
  version: string,
  options?: {
    nowMs?: number;
    maxAgeDays?: number;
    maxFutureSkewDays?: number;
  }
): CanaryClientVersionCheckResult {
  const parsed = parseCanaryDateClientVersion(version);
  if (!parsed) {
    return { matched: false };
  }

  const nowMs = options?.nowMs ?? Date.now();
  const maxAgeDays = options?.maxAgeDays ?? CANARY_CLIENT_VERSION_MAX_AGE_DAYS;
  const maxFutureSkewDays =
    options?.maxFutureSkewDays ?? CANARY_CLIENT_VERSION_MAX_FUTURE_SKEW_DAYS;

  const ageMs = nowMs - parsed.dateMs;
  const maxAgeMs = maxAgeDays * DAY_MS;
  const maxFutureSkewMs = maxFutureSkewDays * DAY_MS;

  return {
    matched: true,
    allowed: ageMs <= maxAgeMs && ageMs >= -maxFutureSkewMs,
    normalized: parsed.normalized,
  };
}

/**
 * StrawNote uses a.b.c.d (d = preview). Strict semver rejects 4-part versions, so
 * coerce them to a.b.c before range checks / satisfies.
 */
export function normalizeClientVersionForSemver(
  version: string
): string | null {
  const trimmed = version.trim();
  if (!trimmed) {
    return null;
  }

  const canary = parseCanaryDateClientVersion(trimmed);
  if (canary) {
    return semver.valid(canary.normalized, { loose: true });
  }

  const valid = semver.valid(trimmed, { loose: true });
  if (valid) {
    return valid;
  }

  // a.b.c.d → a.b.c (preview digit is packaging-only)
  const fourPart = /^v?(\d+)\.(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/i.exec(trimmed);
  if (fourPart) {
    return `${fourPart[1]}.${fourPart[2]}.${fourPart[3]}`;
  }

  return semver.coerce(trimmed)?.version ?? null;
}

function normalizeComparableVersion(version: string): string | null {
  return normalizeClientVersionForSemver(version);
}

export function hasNewerVersion(
  currentVersion: string,
  nextVersion: string
): boolean {
  const current = normalizeComparableVersion(currentVersion);
  const next = normalizeComparableVersion(nextVersion);

  if (!current || !next) {
    return currentVersion.trim() !== nextVersion.trim();
  }

  return semver.gt(next, current, {
    loose: true,
  });
}
