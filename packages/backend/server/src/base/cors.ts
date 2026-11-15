import { URLHelper } from './helpers';

const DEV_LOOPBACK_PROTOCOLS = new Set(['http:', 'https:']);
const DEV_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const MOBILE_CLIENT_ORIGINS = new Set([
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
]);
const DESKTOP_CLIENT_ORIGINS = new Set([
  'assets://.',
  'assets://another-host',
  // for old versions of client, which use file:// as origin
  'file://',
]);

export const CORS_ALLOWED_METHODS = [
  'GET',
  'HEAD',
  'PUT',
  'PATCH',
  'POST',
  'DELETE',
  'OPTIONS',
];

export const CORS_ALLOWED_HEADERS = [
  'accept',
  'authorization',
  'content-type',
  'x-affine-version',
  'x-affine-client-kind',
  'x-operation-name',
  'x-request-id',
  'x-captcha-token',
  'x-captcha-challenge',
  'x-captcha-provider',
  'x-affine-csrf-token',
  'x-requested-with',
  'range',
];

export const CORS_EXPOSED_HEADERS = [
  'content-length',
  'content-range',
  'x-request-id',
];

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
}

function isDevLoopbackOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    return (
      DEV_LOOPBACK_PROTOCOLS.has(parsed.protocol) &&
      DEV_LOOPBACK_HOSTS.has(normalizeHostname(parsed.hostname))
    );
  } catch {
    return false;
  }
}

/**
 * Self-hosted LAN / yarn:dev often browse via http://192.168.x.x:18080 while
 * the API still runs behind externalUrl. Allow RFC1918 (+ loopback) http
 * origins so WebSocket sync is not rejected as CORS.
 */
function isPrivateNetworkHttpOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:') {
      return false;
    }
    const host = normalizeHostname(parsed.hostname);
    if (DEV_LOOPBACK_HOSTS.has(host)) {
      return true;
    }
    const parts = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (!parts) {
      return false;
    }
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  } catch {
    return false;
  }
}

function normalizeCorsOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    // Some websocket clients send ws:// or wss:// as Origin.
    if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') {
      parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildCorsAllowedOrigins(url: URLHelper) {
  return new Set<string>([
    ...url.allowedOrigins,
    ...MOBILE_CLIENT_ORIGINS,
    ...DESKTOP_CLIENT_ORIGINS,
  ]);
}

export function isCorsOriginAllowed(
  origin: string | undefined | null,
  allowedOrigins: Set<string>
) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  const normalizedOrigin = normalizeCorsOrigin(origin);
  if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  if ((env.dev || env.testing) && isDevLoopbackOrigin(origin)) {
    return true;
  }

  if (env.selfhosted && isPrivateNetworkHttpOrigin(origin)) {
    return true;
  }

  return false;
}

export function corsOriginCallback(
  origin: string | undefined,
  allowedOrigins: Set<string>,
  onBlocked: (origin: string) => void,
  callback: (error: Error | null, allow?: boolean) => void
) {
  if (isCorsOriginAllowed(origin, allowedOrigins)) {
    callback(null, true);
    return;
  }

  const blockedOrigin = origin ?? '<empty>';
  onBlocked(blockedOrigin);
  callback(null, false);
}
