/** Public StrawNote destinations (product UI). */
export const STRAWNOTE_GITHUB_URL = 'https://github.com/StrawCoding/StrawNote';
export const STRAWNOTE_HOME_URL = 'https://strawcoding.github.io/StrawNoteWeb/';
export const STRAWNOTE_COMMUNITY_URL =
  'https://github.com/StrawCoding/StrawNote/discussions';
export const STRAWNOTE_RELEASES_URL =
  'https://github.com/StrawCoding/StrawNote/releases';
export const STRAWNOTE_LICENSE_URL =
  'https://github.com/StrawCoding/StrawNote/blob/strawnote/LICENSE';
export const STRAWNOTE_PRIVACY_URL = STRAWNOTE_LICENSE_URL;
export const STRAWNOTE_TERMS_URL = STRAWNOTE_LICENSE_URL;
export const STRAWNOTE_SELFHOST_DOCS_URL =
  'https://github.com/StrawCoding/StrawNote/blob/strawnote/docs/BUILDING.md';

/**
 * Temporary desktop download fallback while StrawNote installers are unfinished.
 * UI shows a developing tip before opening this URL.
 */
export const TEMP_OFFICIAL_DESKTOP_DOWNLOAD_URL = 'https://affine.pro/download';

/** Default built-in cloud for native Play / App Store builds (upstream AFFiNE). */
export const AFFINE_OFFICIAL_CLOUD_URL = 'https://app.affine.pro';

/**
 * Operator-only self-host (not a built-in default). Users add manually under
 * Settings → Servers when self-hosting StrawNote.
 */
export const STRAWNOTE_SELFHOST_CLOUD_URL = 'https://affine.wastebase.xyz';

/** @deprecated Use AFFINE_OFFICIAL_CLOUD_URL or STRAWNOTE_SELFHOST_CLOUD_URL. */
export const STRAWNOTE_CLOUD_URL = STRAWNOTE_SELFHOST_CLOUD_URL;
