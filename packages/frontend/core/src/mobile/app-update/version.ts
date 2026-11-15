/**
 * StrawNote Play versions are a.b.c.d (d = preview / internal digit).
 * Compare the full four-part tuple so 0.28.0.11 > 0.28.0.10.
 */

export function parseStrawNoteVersion(raw: string): number[] | null {
  const trimmed = String(raw ?? '')
    .trim()
    .replace(/^v/i, '');
  if (!trimmed) return null;
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/.exec(
    trimmed
  );
  if (!match) return null;
  return [
    Number(match[1] ?? 0),
    Number(match[2] ?? 0),
    Number(match[3] ?? 0),
    Number(match[4] ?? 0),
  ];
}

/** @returns negative if a < b, 0 if equal, positive if a > b */
export function compareStrawNoteVersions(a: string, b: string): number {
  const left = parseStrawNoteVersion(a);
  const right = parseStrawNoteVersion(b);
  if (!left || !right) {
    return String(a).localeCompare(String(b));
  }
  for (let i = 0; i < 4; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isNewerStrawNoteVersion(
  currentVersion: string,
  latestVersion: string
): boolean {
  return compareStrawNoteVersions(latestVersion, currentVersion) > 0;
}
