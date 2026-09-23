import { API_BASE_URL, AUTH_LOGIN_ENDPOINT } from './apiConfig';

export interface AuthUser {
  username: string;
  displayName: string;
  role: string;
}

export interface AuthSession {
  token: string;
  tokenType: string;
  user: AuthUser;
}

export class AuthenticationRequiredError extends Error {
  constructor(message = 'Authentication required: no active session') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

export const AUTH_SESSION_KEY = 'coghealth_auth_session';
export const UNAUTHORIZED_EVENT = 'coghealth:unauthorized';

let cachedSession: AuthSession | null = null;

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function getSession(): AuthSession | null {
  if (cachedSession) {
    return cachedSession;
  }
  const raw = storage()?.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    cachedSession = parsed.token ? parsed : null;
    return cachedSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  cachedSession = session;
  storage()?.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  cachedSession = null;
  storage()?.removeItem(AUTH_SESSION_KEY);
}

export function getAuthToken(): string | null {
  return getSession()?.token ?? null;
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

export function notifyUnauthorized(): void {
  clearSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}${AUTH_LOGIN_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'Invalid username or password'
        : `Login failed: ${response.status} ${response.statusText}`
    );
  }

  const body = (await response.json()) as { token?: string; type?: string };
  if (!body.token) {
    throw new Error('Login failed: no token returned');
  }

  const session: AuthSession = {
    token: body.token,
    tokenType: body.type || 'Bearer',
    user: { username, displayName: username, role: 'Provider' },
  };
  setSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}
