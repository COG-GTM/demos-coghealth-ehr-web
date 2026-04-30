import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../api'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('get', () => {
    it('sends a GET request to the correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Test' }),
      })

      const result = await api.get('/v1/patients/1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients/1',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual({ id: 1, name: 'Test' })
    })

    it('appends query parameters to the URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await api.get('/v1/patients/search', { q: 'Smith', page: 0, size: 20 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('q=Smith')
      expect(calledUrl).toContain('page=0')
      expect(calledUrl).toContain('size=20')
    })

    it('omits undefined query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await api.get('/v1/patients/search', { q: 'Smith', page: undefined })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('q=Smith')
      expect(calledUrl).not.toContain('page')
    })

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(api.get('/v1/patients/999')).rejects.toThrow(
        'API Error: 404 Not Found'
      )
    })
  })

  describe('post', () => {
    it('sends a POST request with JSON body', async () => {
      const data = { firstName: 'John', lastName: 'Doe' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, ...data }),
      })

      const result = await api.post('/v1/patients', data)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual({ id: 1, ...data })
    })
  })

  describe('put', () => {
    it('sends a PUT request with JSON body', async () => {
      const data = { firstName: 'Jane' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, ...data }),
      })

      await api.put('/v1/patients/1', data)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })
  })

  describe('delete', () => {
    it('sends a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await api.delete('/v1/patients/1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/patients/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
