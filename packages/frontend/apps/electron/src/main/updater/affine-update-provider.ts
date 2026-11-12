// credits: migrated from https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/providers/GitHubProvider.ts

import {
  CancellationToken,
  type CustomPublishOptions,
  HttpError,
  newError,
  type UpdateInfo,
} from 'builder-util-runtime';
import type { AppUpdater, ResolvedUpdateFileInfo } from 'electron-updater';
import { Provider } from 'electron-updater';
import type { ProviderRuntimeOptions } from 'electron-updater/out/providers/Provider';
import {
  getFileList,
  parseUpdateInfo,
} from 'electron-updater/out/providers/Provider';

import type { buildType } from '../config';
import { isSquirrelBuild } from './utils';

interface GithubUpdateInfo extends UpdateInfo {
  tag: string;
}

interface GithubRelease {
  url: string;
  name: string;
  tag_name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: Array<{
    name: string;
    url: string;
    browser_download_url?: string;
    size: number;
  }>;
}

function assetDownloadUrl(asset: GithubRelease['assets'][number]) {
  // Prefer public browser download URLs from GitHub Releases API.
  return asset.browser_download_url || asset.url;
}

interface UpdateProviderOptions {
  feedUrl?: string;
  channel: typeof buildType;
}

export class StrawNoteUpdateProvider extends Provider<GithubUpdateInfo> {
  static configFeed(options: UpdateProviderOptions): CustomPublishOptions {
    return {
      provider: 'custom',
      // StrawNote: read releases from our GitHub repo (not affine.pro).
      feedUrl: 'https://api.github.com/repos/StrawCoding/StrawNote/releases',
      updateProvider: StrawNoteUpdateProvider,
      ...options,
    };
  }

  constructor(
    private readonly options: CustomPublishOptions,
    _updater: AppUpdater,
    runtimeOptions: ProviderRuntimeOptions
  ) {
    super(runtimeOptions);
  }

  get feedUrl(): URL {
    const url = new URL(this.options.feedUrl);
    url.searchParams.set('channel', this.options.channel);
    url.searchParams.set('minimal', 'true');

    return url;
  }

  async getLatestVersion(): Promise<GithubUpdateInfo> {
    const cancellationToken = new CancellationToken();

    const releasesJsonStr = await this.httpRequest(
      this.feedUrl,
      {
        accept: 'application/json',
        'cache-control': 'no-cache',
      },
      cancellationToken
    );

    if (!releasesJsonStr) {
      throw new Error(
        `Failed to get releases from ${this.feedUrl.toString()}, response is empty`
      );
    }

    const releasesRaw: GithubRelease[] = JSON.parse(releasesJsonStr);
    const channel = String(this.options.channel);
    const releases = releasesRaw.filter(release => {
      if (release.draft) return false;
      const tag = release.tag_name.toLowerCase();
      if (channel === 'canary') return tag.includes('canary');
      if (channel === 'beta') return tag.includes('beta');
      if (channel === 'internal') return tag.includes('internal');
      // stable: exclude prerelease channels
      return !tag.includes('canary') && !tag.includes('beta') && !tag.includes('internal');
    });

    if (releases.length === 0) {
      throw new Error(
        `No published versions in channel ${this.options.channel}`
      );
    }

    const channelFileName = 'latest.yml';
    const squirrel = isSquirrelBuild();
    for (const release of releases) {
      const channelFileAsset = release.assets.find(
        ({ name }) => name === channelFileName
      );
      if (!channelFileAsset) {
        continue;
      }

      const installers = release.assets.filter(({ name }) =>
        availableForMyPlatformAndInstaller(
          name,
          process.platform,
          process.arch,
          squirrel
        )
      );
      if (installers.length === 0) {
        continue;
      }

      const channelFileUrl = new URL(assetDownloadUrl(channelFileAsset));
      let channelFileContent: string | null;
      try {
        channelFileContent = await this.httpRequest(channelFileUrl);
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 404) {
          continue;
        }
        throw error;
      }

      const result = parseUpdateInfo(
        channelFileContent,
        channelFileName,
        channelFileUrl
      );
      const files = result.files.flatMap(file => {
        const asset = installers.find(({ name }) => name === file.url);
        return asset ? [{ ...file, url: assetDownloadUrl(asset) }] : [];
      });
      if (files.length === 0) {
        continue;
      }

      return {
        ...result,
        files,
        tag: release.tag_name,
        releaseName: result.releaseName ?? release.name,
        releaseNotes: result.releaseNotes ?? release.body,
      };
    }

    throw newError(
      `Cannot find ${channelFileName} with compatible installers in channel ${this.options.channel}.`,
      'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND'
    );
  }

  resolveFiles(updateInfo: GithubUpdateInfo): Array<ResolvedUpdateFileInfo> {
    const files = getFileList(updateInfo);

    return files
      .filter(({ url }) =>
        availableForMyPlatformAndInstaller(
          url,
          process.platform,
          process.arch,
          isSquirrelBuild()
        )
      )
      .map(file => ({
        url: new URL(file.url),
        info: file,
      }));
  }
}

type VersionDistribution = 'canary' | 'beta' | 'stable';
type VersionPlatform = 'windows' | 'macos' | 'linux';
type VersionArch = 'x64' | 'arm64';
type FileParts =
  | ['affine' | 'strawnote', string, VersionDistribution, VersionPlatform, VersionArch]
  | [
      'affine' | 'strawnote',
      string,
      `${'canary' | 'beta'}.${number}`,
      VersionDistribution,
      VersionPlatform,
      VersionArch,
    ];

export function availableForMyPlatformAndInstaller(
  file: string,
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture,
  // moved to parameter to make test coverage easier
  imWindowsSquirrelPkg: boolean
): boolean {
  const imArm64 = arch === 'arm64';
  const imX64 = arch === 'x64';
  const imMacos = platform === 'darwin';
  const imWindows = platform === 'win32';
  const imLinux = platform === 'linux';

  //  in form of:
  //   strawnote-${build}-${buildSuffix}-${distribution}-${platform}-${arch}.${installer}
  //          ^ 1.0.0    ^canary.1    ^ canary        ^windows    ^ x64  ^.nsis.exe
  const filename = file.split('/').pop();

  if (!filename) {
    return false;
  }

  const parts = filename.split('-') as FileParts;

  // fix -${arch}.${installer}
  const archDotInstaller = parts[parts.length - 1];
  const installerIdx = archDotInstaller.indexOf('.');
  if (installerIdx === -1) {
    return false;
  }
  const installer = archDotInstaller.substring(installerIdx + 1);
  parts[parts.length - 1] = archDotInstaller.substring(0, installerIdx);

  let version: {
    build: string;
    suffix?: string;
    distribution: VersionDistribution;
    platform: VersionPlatform;
    arch: VersionArch;
    installer: string;
  };

  if (parts.length === 5) {
    version = {
      build: parts[1],
      distribution: parts[2],
      platform: parts[3],
      arch: parts[4],
      installer,
    };
  } else if (parts.length === 6) {
    version = {
      build: parts[1],
      suffix: parts[2],
      distribution: parts[3],
      platform: parts[4],
      arch: parts[5],
      installer,
    };
  } else {
    return false;
  }

  function matchPlatform(platform: VersionPlatform) {
    return (
      (platform === 'windows' && imWindows) ||
      (platform === 'macos' && imMacos) ||
      (platform === 'linux' && imLinux)
    );
  }

  function matchArch(arch: VersionArch) {
    return (
      // off course we can install x64 on x64
      (imX64 && arch === 'x64') ||
      // arm64 macos can install arm64 or x64 in rosetta2
      (imArm64 && (arch === 'arm64' || imMacos))
    );
  }

  function matchInstaller(installer: string) {
    // do not allow squirrel or nsis installer to cross download each other on windows
    if (!imWindows) {
      return true;
    }

    return imWindowsSquirrelPkg
      ? installer === 'exe'
      : installer === 'nsis.exe';
  }

  return (
    matchPlatform(version.platform) &&
    matchArch(version.arch) &&
    matchInstaller(version.installer)
  );
}
