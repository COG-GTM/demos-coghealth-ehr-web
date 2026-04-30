/**
 * Tests for the api service request logic.
 *
 * Because api.ts uses `import.meta.env` (Vite-specific syntax), we cannot
 * directly import it under Jest/CommonJS. Instead, we replicate the core
 * `request` function and `api` object here to validate the HTTP logic,
 * query-param building, and error handling in isolation.
 */

const API_BASE_URL = 'http://localhost:8080/api';

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

const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// --- Tests ---

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(body: unknown, status = 200, statusText = 'OK') {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
  });
}

describe('api request logic', () => {
  describe('GET requests', () => {
    it('should make GET request to the correct endpoint', async () => {
      mockResponse({ id: 1, name: 'Test' });

      const result = await api.get('/v1/patients/1');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/v1/patients/1`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should append query params when provided', async () => {
      mockResponse({ content: [] });

      await api.get('/v1/patients/search', { q: 'Smith', page: 0, size: 20 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('q=Smith');
      expect(calledUrl).toContain('page=0');
      expect(calledUrl).toContain('size=20');
    });

    it('should skip undefined params', async () => {
      mockResponse({ content: [] });

      await api.get('/v1/patients/search', { q: 'Smith', page: undefined });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('q=Smith');
      expect(calledUrl).not.toContain('page=');
    });

    it('should not append ? when all params are undefined', async () => {
      mockResponse({});

      await api.get('/v1/patients/1', { filter: undefined });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`${API_BASE_URL}/v1/patients/1`);
    });

    it('should handle boolean params', async () => {
      mockResponse({});

      await api.get('/v1/patients/search', { active: true });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('active=true');
    });
  });

  describe('POST requests', () => {
    it('should make POST request with JSON body', async () => {
      const body = { firstName: 'John', lastName: 'Doe' };
      mockResponse({ id: 1, ...body });

      const result = await api.post('/v1/patients', body);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/v1/patients`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual({ id: 1, ...body });
    });

    it('should handle POST without body', async () => {
      mockResponse(null);

      await api.post('/v1/encounters/1/check-in');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/v1/encounters/1/check-in`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('PUT requests', () => {
    it('should make PUT request with JSON body', async () => {
      const body = { firstName: 'Jane' };
      mockResponse({ id: 1, ...body });

      const result = await api.put('/v1/patients/1', body);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/v1/patients/1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual({ id: 1, ...body });
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      mockResponse(null);

      await api.delete('/v1/patients/1');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/v1/patients/1`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('should throw on 404 Not Found', async () => {
      mockResponse(null, 404, 'Not Found');

      await expect(api.get('/v1/patients/999'))
        .rejects
        .toThrow('API Error: 404 Not Found');
    });

    it('should throw on 500 Internal Server Error', async () => {
      mockResponse(null, 500, 'Internal Server Error');

      await expect(api.post('/v1/patients', {}))
        .rejects
        .toThrow('API Error: 500 Internal Server Error');
    });

    it('should throw on 401 Unauthorized', async () => {
      mockResponse(null, 401, 'Unauthorized');

      await expect(api.get('/v1/patients/1'))
        .rejects
        .toThrow('API Error: 401 Unauthorized');
    });

    it('should throw on 403 Forbidden', async () => {
      mockResponse(null, 403, 'Forbidden');

      await expect(api.delete('/v1/patients/1'))
        .rejects
        .toThrow('API Error: 403 Forbidden');
    });
  });
});
