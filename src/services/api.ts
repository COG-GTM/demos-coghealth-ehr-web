const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
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
    credentials: 'include',
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

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
