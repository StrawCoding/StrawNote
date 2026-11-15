import {
  OAuthProviderType,
  ServerDeploymentType,
  ServerFeature,
} from '@affine/graphql';

import { AFFINE_OFFICIAL_CLOUD_URL } from '../../constants/strawnote-links';
import { DEFAULT_SELF_HOSTED_SERVER_NAME } from './server-name';
import type { ServerConfig, ServerMetadata } from './types';

/**
 * Default cloud:
 * - Web selfhost → location.origin
 * - Native stable → AFFiNE Cloud (app.affine.pro), typed Affine
 * - Private wastebase self-host is never baked in; add under Settings → Servers.
 */
function nativeCloudBaseUrl(): string {
  switch (BUILD_CONFIG.appBuildType) {
    case 'canary':
      return 'https://affine.fail';
    case 'beta':
    case 'internal':
      return 'https://insider.affine.pro';
    default:
      return AFFINE_OFFICIAL_CLOUD_URL;
  }
}

function cloudServerConfig(type: ServerDeploymentType): ServerConfig {
  return {
    serverName:
      type === ServerDeploymentType.Affine ? 'AFFiNE Cloud' : 'StrawNote Cloud',
    features: [
      ServerFeature.Indexer,
      ServerFeature.Copilot,
      ServerFeature.CopilotEmbedding,
      ServerFeature.OAuth,
      ServerFeature.Payment,
      ServerFeature.LocalWorkspace,
    ],
    oauthProviders: [OAuthProviderType.Google, OAuthProviderType.Apple],
    type,
    credentialsRequirement: {
      password: {
        minLength: 8,
        maxLength: 32,
      },
    },
  };
}
export const BUILD_IN_SERVERS: (ServerMetadata & { config: ServerConfig })[] =
  environment.isSelfHosted
    ? [
        {
          id: 'affine-cloud',
          baseUrl: location.origin,
          // selfhosted baseUrl is `location.origin`
          // this is ok for web app, but not for desktop app
          // since we never build desktop app in selfhosted mode, so it's fine
          config: {
            serverName: DEFAULT_SELF_HOSTED_SERVER_NAME,
            features: [],
            oauthProviders: [],
            type: ServerDeploymentType.Selfhosted,
            credentialsRequirement: {
              password: {
                minLength: 8,
                maxLength: 32,
              },
            },
          },
        },
      ]
    : BUILD_CONFIG.debug
      ? [
          {
            id: 'affine-cloud',
            baseUrl: BUILD_CONFIG.isElectron
              ? 'http://localhost:18080'
              : location.origin,
            config: {
              serverName: 'StrawNote Cloud',
              features: [
                ServerFeature.Indexer,
                ServerFeature.Copilot,
                ServerFeature.CopilotEmbedding,
                ServerFeature.OAuth,
                ServerFeature.Payment,
                ServerFeature.LocalWorkspace,
              ],
              oauthProviders: [
                OAuthProviderType.Google,
                OAuthProviderType.Apple,
              ],
              type: ServerDeploymentType.Selfhosted,
              credentialsRequirement: {
                password: {
                  minLength: 8,
                  maxLength: 32,
                },
              },
            },
          },
        ]
      : BUILD_CONFIG.appBuildType === 'stable' ||
          BUILD_CONFIG.appBuildType === 'beta' ||
          BUILD_CONFIG.appBuildType === 'internal' ||
          BUILD_CONFIG.appBuildType === 'canary'
        ? [
            {
              id: 'affine-cloud',
              baseUrl: BUILD_CONFIG.isNative
                ? nativeCloudBaseUrl()
                : location.origin,
              config: cloudServerConfig(ServerDeploymentType.Affine),
            },
          ]
        : [];

export type TelemetryChannel =
  | 'stable'
  | 'beta'
  | 'internal'
  | 'canary'
  | 'local';

const OFFICIAL_TELEMETRY_ENDPOINTS: Record<TelemetryChannel, string> = {
  stable: AFFINE_OFFICIAL_CLOUD_URL,
  beta: 'https://insider.affine.pro',
  internal: 'https://insider.affine.pro',
  canary: 'https://affine.fail',
  local: 'http://localhost:18080',
};

export function getOfficialTelemetryEndpoint(
  channel = BUILD_CONFIG.appBuildType
): string {
  if (BUILD_CONFIG.debug) {
    return BUILD_CONFIG.isNative
      ? OFFICIAL_TELEMETRY_ENDPOINTS.local
      : location.origin;
  } else if (['beta', 'internal', 'canary', 'stable'].includes(channel)) {
    return OFFICIAL_TELEMETRY_ENDPOINTS[channel];
  }

  return OFFICIAL_TELEMETRY_ENDPOINTS.stable;
}
