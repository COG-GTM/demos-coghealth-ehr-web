import { API_BASE_URL } from './apiConfig';
import {
  AuthenticationRequiredError,
  getSession,
  notifyUnauthorized,
} from './authService';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  const session = getSession();
  if (!session) {
    throw new AuthenticationRequiredError(`Refusing to call ${endpoint} without an authenticated session`);
  }

  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${session.tokenType} ${session.token}`,
      ...fetchOptions.headers,
    },
  });

  if (response.status === 401 || response.status === 403) {
    notifyUnauthorized();
    throw new AuthenticationRequiredError(
      `API Error: ${response.status} ${response.statusText}`
    );
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) => 
    request<T>(endpoint, { method: 'GET', params }),
  
  post: <T>(endpoint: string, data?: unknown) => 
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  
  put: <T>(endpoint: string, data?: unknown) => 
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: <T>(endpoint: string) => 
    request<T>(endpoint, { method: 'DELETE' }),
};
