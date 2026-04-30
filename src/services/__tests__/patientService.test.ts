import { describe, it, expect, vi, beforeEach } from 'vitest'
import { patientService } from '../patientService'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

describe('patientService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getById', () => {
    it('calls api.get with correct endpoint', async () => {
      const mockPatient = { id: 1, firstName: 'John', lastName: 'Smith' }
      mockedApi.get.mockResolvedValueOnce(mockPatient)

      const result = await patientService.getById(1)

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/1')
      expect(result).toEqual(mockPatient)
    })
  })

  describe('getByMrn', () => {
    it('calls api.get with correct endpoint', async () => {
      const mockPatient = { id: 1, mrn: 'MRN001234', firstName: 'John', lastName: 'Smith' }
      mockedApi.get.mockResolvedValueOnce(mockPatient)

      const result = await patientService.getByMrn('MRN001234')

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN001234')
      expect(result).toEqual(mockPatient)
    })
  })

  describe('search', () => {
    it('calls api.get with search params', async () => {
      const mockResults = { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 }
      mockedApi.get.mockResolvedValueOnce(mockResults)

      const result = await patientService.search('Smith')

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', {
        q: 'Smith',
        page: 0,
        size: 20,
      })
      expect(result).toEqual(mockResults)
    })

    it('supports custom pagination parameters', async () => {
      mockedApi.get.mockResolvedValueOnce({ content: [] })

      await patientService.search('Doe', 2, 10)

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', {
        q: 'Doe',
        page: 2,
        size: 10,
      })
    })
  })

  describe('create', () => {
    it('calls api.post with patient data', async () => {
      const newPatient = { firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1990-01-01' }
      mockedApi.post.mockResolvedValueOnce({ id: 2, ...newPatient })

      const result = await patientService.create(newPatient)

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/patients', newPatient)
      expect(result).toEqual({ id: 2, ...newPatient })
    })
  })

  describe('update', () => {
    it('calls api.put with patient id and data', async () => {
      const updates = { firstName: 'Janet' }
      mockedApi.put.mockResolvedValueOnce({ id: 1, ...updates })

      const result = await patientService.update(1, updates)

      expect(mockedApi.put).toHaveBeenCalledWith('/v1/patients/1', updates)
      expect(result).toEqual({ id: 1, ...updates })
    })
  })
})
