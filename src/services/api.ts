import { API_BASE_URL } from './apiConfig';
import { authHeaders, clearAuthToken, UnauthorizedError } from './authToken';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Endpoints that establish a session (login) and therefore carry no token yet. */
  anonymous?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, anonymous, ...fetchOptions } = options;
  
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
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(anonymous ? {} : authHeaders()),
      ...fetchOptions.headers,
    },
  });

  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
    throw new UnauthorizedError(response.status);
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

  postAnonymous: <T>(endpoint: string, data?: unknown) => 
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), anonymous: true }),
};
