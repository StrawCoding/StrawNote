/** Public StrawNote destinations (product UI). */
export const STRAWNOTE_HOME_URL = 'https://github.com/StrawCoding/StrawNote';
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

/**
 * Default cloud origin for StrawNote native builds = self-hosted.
 * Official AFFiNE Cloud is a different product; keep wastebase as the default
 * so Android/iOS sync against the same server users already use on web.
 */
export const STRAWNOTE_CLOUD_URL = 'https://affine.wastebase.xyz';
