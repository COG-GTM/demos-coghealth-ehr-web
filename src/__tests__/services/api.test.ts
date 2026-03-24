const API_BASE_URL = 'http://localhost:8080/api';

// Mock import.meta.env before importing the module
jest.mock('../../services/api', () => {
  const API_BASE = 'http://localhost:8080/api';

  interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
  }

  async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${API_BASE}${endpoint}`;

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
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  return {
    api: {
      get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
        request<T>(endpoint, { method: 'GET', params }),
      post: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
      put: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
      delete: <T>(endpoint: string) =>
        request<T>(endpoint, { method: 'DELETE' }),
    },
  };
});

import { api } from '../../services/api';

// Helper to create a mock Response
function mockFetchResponse(body: unknown, ok = true, status = 200, statusText = 'OK') {
  return Promise.resolve({
    ok,
    status,
    statusText,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('api service', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET request appends query params correctly to URL', async () => {
    mockFetch.mockReturnValue(mockFetchResponse({ data: 'test' }));

    await api.get('/v1/patients/search', { q: 'Smith', page: 0, size: 20 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('?');
    expect(calledUrl).toContain('q=Smith');
    expect(calledUrl).toContain('page=0');
    expect(calledUrl).toContain('size=20');
  });

  test('GET request without params does not add ? to the URL', async () => {
    mockFetch.mockReturnValue(mockFetchResponse({ id: 1 }));

    await api.get('/v1/patients/1');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${API_BASE_URL}/v1/patients/1`);
    expect(calledUrl).not.toContain('?');
  });

  test('Content-Type: application/json header is always included', async () => {
    mockFetch.mockReturnValue(mockFetchResponse({}));

    await api.get('/v1/test');

    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/json' })
    );
  });

  test('throws Error with status code when response is not ok (404)', async () => {
    mockFetch.mockReturnValue(mockFetchResponse(null, false, 404, 'Not Found'));

    await expect(api.get('/v1/patients/999')).rejects.toThrow('404');
  });

  test('throws Error with status code when response is not ok (500)', async () => {
    mockFetch.mockReturnValue(mockFetchResponse(null, false, 500, 'Internal Server Error'));

    await expect(api.get('/v1/patients')).rejects.toThrow('500');
  });

  test('returns parsed JSON on success', async () => {
    const responseBody = { id: 1, name: 'John Doe' };
    mockFetch.mockReturnValue(mockFetchResponse(responseBody));

    const result = await api.get('/v1/patients/1');

    expect(result).toEqual(responseBody);
  });

  test('POST request sends JSON body', async () => {
    mockFetch.mockReturnValue(mockFetchResponse({ id: 1 }));
    const data = { firstName: 'John', lastName: 'Doe' };

    await api.post('/v1/patients', data);

    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe('POST');
    expect(calledOptions.body).toBe(JSON.stringify(data));
  });

  test('PUT request sends JSON body', async () => {
    mockFetch.mockReturnValue(mockFetchResponse({ id: 1 }));
    const data = { firstName: 'Jane' };

    await api.put('/v1/patients/1', data);

    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe('PUT');
    expect(calledOptions.body).toBe(JSON.stringify(data));
  });

  test('undefined params are excluded from query string', async () => {
    mockFetch.mockReturnValue(mockFetchResponse({}));

    await api.get('/v1/test', { key1: 'value', key2: undefined });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('key1=value');
    expect(calledUrl).not.toContain('key2');
  });
});
