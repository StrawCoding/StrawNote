/**
 * StrawNote package versions are a.b.c.d (d = preview). Socket/realtime
 * protocol checks use strict semver ranges (e.g. >=0.26.0), so send a.b.c.
 */
export function toProtocolClientVersion(version: string): string {
  const trimmed = version.trim().replace(/^v/i, '');
  const fourPart = /^(\d+)\.(\d+)\.(\d+)\.(\d+)([-+][0-9A-Za-z.-]+)?$/.exec(
    trimmed
  );
  if (fourPart) {
    return `${fourPart[1]}.${fourPart[2]}.${fourPart[3]}${fourPart[5] ?? ''}`;
  }
  return trimmed;
}
