const TOKEN_STORAGE_KEY = 'coghealth_auth_token';

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

export function setAuthToken(token: string): void {
  storage()?.setItem(TOKEN_STORAGE_KEY, token);
}

export function getAuthToken(): string | null {
  return storage()?.getItem(TOKEN_STORAGE_KEY) ?? null;
}

export function clearAuthToken(): void {
  storage()?.removeItem(TOKEN_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    throw new MissingAuthTokenError();
  }
  return { Authorization: `Bearer ${token}` };
}
