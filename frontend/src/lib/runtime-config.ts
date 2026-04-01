/**
 * Runtime URL helpers for local split-dev and same-origin deployments.
 */

const LOCAL_FRONTEND_PORTS = new Set(['3000', '3001', '5173', '4173']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isLocalFrontendHost(hostname: string, port: string) {
  return LOCAL_HOSTS.has(hostname) && LOCAL_FRONTEND_PORTS.has(port);
}

export function resolveApiOrigin() {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApiUrl) {
    return trimTrailingSlash(configuredApiUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;

    if (isLocalFrontendHost(hostname, port)) {
      return `${protocol}//${hostname}:8000`;
    }

    return trimTrailingSlash(origin);
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }

  return '';
}

export function resolveApiBaseUrl() {
  const apiOrigin = resolveApiOrigin();
  return apiOrigin ? `${apiOrigin}/api` : '/api';
}

export function resolveWsBaseUrl() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configuredWsUrl) {
    return trimTrailingSlash(configuredWsUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;

    if (isLocalFrontendHost(hostname, port)) {
      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${hostname}:8000`;
    }

    return trimTrailingSlash(origin).replace(/^http/, 'ws');
  }

  return 'ws://localhost:8000';
}
