import { api } from './api';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(data: unknown, ok = true, status = 200, statusText = 'OK') {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    statusText,
    json: () => Promise.resolve(data),
  });
}

describe('api', () => {
  describe('get', () => {
    it('sends a GET request to the correct URL', async () => {
      mockResponse({ id: 1 });
      const result = await api.get('/v1/patients/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/patients/1'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual({ id: 1 });
    });

    it('appends query params and omits undefined values', async () => {
      mockResponse([]);
      await api.get('/v1/patients/search', { q: 'smith', page: 0, size: 20, extra: undefined });

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('q=smith');
      expect(url).toContain('page=0');
      expect(url).toContain('size=20');
      expect(url).not.toContain('extra');
    });

    it('does not append query string when no params given', async () => {
      mockResponse({});
      await api.get('/v1/test');

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).not.toContain('?');
    });
  });

  describe('post', () => {
    it('sends a POST request with JSON body', async () => {
      const body = { firstName: 'John', lastName: 'Doe' };
      mockResponse({ id: 1, ...body });
      const result = await api.post('/v1/patients', body);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/patients'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
      expect(result).toEqual({ id: 1, ...body });
    });
  });

  describe('put', () => {
    it('sends a PUT request with JSON body', async () => {
      const body = { firstName: 'Jane' };
      mockResponse({ id: 1, ...body });
      await api.put('/v1/patients/1', body);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/patients/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe('delete', () => {
    it('sends a DELETE request', async () => {
      mockResponse(null);
      await api.delete('/v1/patients/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/patients/1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('error handling', () => {
    it('throws on non-OK response', async () => {
      mockResponse(null, false, 404, 'Not Found');
      await expect(api.get('/v1/missing')).rejects.toThrow('API Error: 404 Not Found');
    });

    it('throws on 500 server error', async () => {
      mockResponse(null, false, 500, 'Internal Server Error');
      await expect(api.post('/v1/test', {})).rejects.toThrow('API Error: 500 Internal Server Error');
    });
  });

  describe('headers', () => {
    it('includes Content-Type application/json', async () => {
      mockResponse({});
      await api.get('/v1/test');

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers['Content-Type']).toBe('application/json');
    });
  });
});
