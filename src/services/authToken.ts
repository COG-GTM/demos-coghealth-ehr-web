const TOKEN_STORAGE_KEY = 'coghealth_auth_token';

export const UNAUTHORIZED_EVENT = 'coghealth:unauthorized';

export class MissingAuthTokenError extends Error {
  constructor() {
    super('Not authenticated: no session token available for this request');
    this.name = 'MissingAuthTokenError';
  }
}

export class UnauthorizedError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Not authorized: API responded with ${status}`);
    this.name = 'UnauthorizedError';
    this.status = status;
  }
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

const MAX_TIMEOUT_MS = 2_147_483_647;

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

export function setAuthToken(token: string): void {
  storage()?.setItem(TOKEN_STORAGE_KEY, token);
  scheduleExpiry(token);
}

export function getAuthToken(): string | null {
  const token = storage()?.getItem(TOKEN_STORAGE_KEY) ?? null;
  if (token && isExpired(token)) {
    clearAuthToken();
    return null;
  }
  return token;
}

export function clearAuthToken(): void {
  cancelExpiry();
  storage()?.removeItem(TOKEN_STORAGE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

// Expiry has to end the session on its own: an idle user may never issue
// another request that would notice the token has gone stale.
export function scheduleExpiry(token: string | null = getAuthToken()): void {
  cancelExpiry();
  const exp = token === null ? null : expiryOf(token);
  if (exp === null) {
    return;
  }
  const remaining = exp * 1000 - Date.now();
  if (remaining <= 0) {
    clearAuthToken();
    return;
  }
  // setTimeout truncates delays past 2^31-1 ms, so re-arm in chunks.
  expiryTimer = setTimeout(
    () => scheduleExpiry(token),
    Math.min(remaining, MAX_TIMEOUT_MS)
  );
}

function cancelExpiry(): void {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

function isExpired(token: string): boolean {
  const exp = expiryOf(token);
  return exp === null || exp * 1000 <= Date.now();
}

function expiryOf(token: string): number | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }
  try {
    const claims: unknown = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (
      typeof claims === 'object' &&
      claims !== null &&
      typeof (claims as { exp?: unknown }).exp === 'number'
    ) {
      return (claims as { exp: number }).exp;
    }
    return null;
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    throw new MissingAuthTokenError();
  }
  return { Authorization: `Bearer ${token}` };
}
