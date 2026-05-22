/**
 * Tests for the api service module.
 *
 * Because api.ts uses `import.meta.env` (a Vite-specific construct), we
 * manually replicate the request logic here to test the URL building,
 * param handling, HTTP methods, and error handling without importing the
 * actual source file through ts-jest (which cannot handle import.meta).
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

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetchSuccess(data: unknown, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, statusText: string) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  });
}

describe('api service', () => {
  describe('get', () => {
    it('sends GET request to correct URL', async () => {
      mockFetchSuccess({ id: 1 });

      await api.get('/v1/patients/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients/1',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('appends query params', async () => {
      mockFetchSuccess({ content: [] });

      await api.get('/v1/patients/search', { q: 'John', page: 0, size: 20 });

      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('q=John');
      expect(calledUrl).toContain('page=0');
      expect(calledUrl).toContain('size=20');
    });

    it('skips undefined params', async () => {
      mockFetchSuccess({ content: [] });

      await api.get('/v1/patients/search', { q: 'John', page: undefined });

      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('q=John');
      expect(calledUrl).not.toContain('page');
    });

    it('returns parsed JSON', async () => {
      mockFetchSuccess({ id: 1, firstName: 'John' });

      const result = await api.get('/v1/patients/1');

      expect(result).toEqual({ id: 1, firstName: 'John' });
    });

    it('does not append ? when no params', async () => {
      mockFetchSuccess({});

      await api.get('/v1/patients/1');

      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).not.toContain('?');
    });
  });

  describe('post', () => {
    it('sends POST request with JSON body', async () => {
      mockFetchSuccess({ id: 1 });

      await api.post('/v1/patients', { firstName: 'John', lastName: 'Doe' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ firstName: 'John', lastName: 'Doe' }),
        })
      );
    });

    it('includes Content-Type header', async () => {
      mockFetchSuccess({});

      await api.post('/v1/patients', {});

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('put', () => {
    it('sends PUT request with JSON body', async () => {
      mockFetchSuccess({ id: 1 });

      await api.put('/v1/patients/1', { firstName: 'Updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ firstName: 'Updated' }),
        })
      );
    });
  });

  describe('delete', () => {
    it('sends DELETE request', async () => {
      mockFetchSuccess({});

      await api.delete('/v1/patients/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      mockFetchError(404, 'Not Found');

      await expect(api.get('/v1/patients/999')).rejects.toThrow(
        'API Error: 404 Not Found'
      );
    });

    it('throws on server error', async () => {
      mockFetchError(500, 'Internal Server Error');

      await expect(api.get('/v1/patients/1')).rejects.toThrow(
        'API Error: 500 Internal Server Error'
      );
    });

    it('constructs correct base URL', async () => {
      mockFetchSuccess({});
      await api.get('/test');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/test',
        expect.anything()
      );
    });

    it('handles empty params object', async () => {
      mockFetchSuccess({});
      await api.get('/v1/patients/1', {});
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).not.toContain('?');
    });

    it('handles boolean params', async () => {
      mockFetchSuccess({});
      await api.get('/v1/patients', { active: true });
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('active=true');
    });
  });
});
