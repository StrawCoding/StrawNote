import { isNewerStrawNoteVersion } from './version';

export const STRAWNOTE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.strawcoding.strawnote';

const DEFAULT_MANIFEST_URLS = [
  'https://cdn.jsdelivr.net/gh/StrawCoding/StrawNote@strawnote/packages/frontend/core/public/app-update.json',
  'https://raw.githubusercontent.com/StrawCoding/StrawNote/strawnote/packages/frontend/core/public/app-update.json',
  '/app-update.json',
];

const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/StrawCoding/StrawNote/releases/latest';

const FETCH_TIMEOUT_MS = 6000;

export type AppUpdateManifest = {
  latestVersion: string;
  playUrl?: string;
  message?: string;
};

export type AppUpdateCheckResult = {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  playUrl: string;
  message: string;
  checkFailed: boolean;
  source?: string;
};

function normalizeVersionTag(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^v/i, '');
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAppUpdateManifest(
  urls: string[] = DEFAULT_MANIFEST_URLS
): Promise<{ manifest: AppUpdateManifest; source: string } | null> {
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) continue;
      const data = (await response.json()) as Partial<AppUpdateManifest>;
      const latestVersion = normalizeVersionTag(data.latestVersion);
      if (!latestVersion) continue;
      return {
        source: url,
        manifest: {
          latestVersion,
          playUrl: String(data.playUrl ?? '').trim() || STRAWNOTE_PLAY_URL,
          message: String(data.message ?? '').trim(),
        },
      };
    } catch {
      // try next
    }
  }
  return null;
}

export async function fetchLatestGitHubReleaseVersion(): Promise<
  string | null
> {
  try {
    const response = await fetchWithTimeout(GITHUB_LATEST_RELEASE_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    const version = normalizeVersionTag(data.tag_name);
    return version || null;
  } catch {
    return null;
  }
}

export function resolveCurrentAppVersion(
  buildConfigVersion?: string,
  nativeVersion?: string
): string {
  const native = normalizeVersionTag(nativeVersion);
  if (native) return native;
  const build = normalizeVersionTag(buildConfigVersion);
  if (build) return build;
  return '0.0.0.0';
}

export async function checkForStrawNoteAppUpdate(options?: {
  currentVersion?: string;
  manifestUrls?: string[];
}): Promise<AppUpdateCheckResult> {
  const currentVersion = resolveCurrentAppVersion(
    options?.currentVersion,
    undefined
  );

  const fromManifest = await fetchAppUpdateManifest(options?.manifestUrls);
  let latestVersion = fromManifest?.manifest.latestVersion ?? '';
  let playUrl = fromManifest?.manifest.playUrl ?? STRAWNOTE_PLAY_URL;
  let message = fromManifest?.manifest.message ?? '';
  let source = fromManifest?.source;

  if (!latestVersion) {
    const fromGitHub = await fetchLatestGitHubReleaseVersion();
    if (fromGitHub) {
      latestVersion = fromGitHub;
      source = GITHUB_LATEST_RELEASE_URL;
    }
  }

  if (!latestVersion) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: '',
      playUrl,
      message,
      checkFailed: true,
      source,
    };
  }

  return {
    hasUpdate: isNewerStrawNoteVersion(currentVersion, latestVersion),
    currentVersion,
    latestVersion,
    playUrl,
    message,
    checkFailed: false,
    source,
  };
}
