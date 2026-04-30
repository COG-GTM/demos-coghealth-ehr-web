import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encounterService } from '../encounterService'
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

describe('encounterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getById', () => {
    it('calls api.get with correct endpoint', async () => {
      const mockEncounter = { id: 1, patientId: 1, encounterType: 'OUTPATIENT', status: 'PLANNED' }
      mockedApi.get.mockResolvedValueOnce(mockEncounter)

      const result = await encounterService.getById(1)

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/1')
      expect(result).toEqual(mockEncounter)
    })
  })

  describe('getByNumber', () => {
    it('calls api.get with encounter number', async () => {
      mockedApi.get.mockResolvedValueOnce({ encounterNumber: 'ENC001' })

      await encounterService.getByNumber('ENC001')

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/number/ENC001')
    })
  })

  describe('getByPatient', () => {
    it('calls api.get with patient id', async () => {
      mockedApi.get.mockResolvedValueOnce([])

      await encounterService.getByPatient(1)

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/patient/1')
    })
  })

  describe('getByProvider', () => {
    it('calls api.get with provider id', async () => {
      mockedApi.get.mockResolvedValueOnce([])

      await encounterService.getByProvider(5)

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5')
    })
  })

  describe('getProviderSchedule', () => {
    it('calls api.get with provider id and date', async () => {
      mockedApi.get.mockResolvedValueOnce([])

      await encounterService.getProviderSchedule(5, '2024-01-15')

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5/schedule', {
        date: '2024-01-15',
      })
    })
  })

  describe('getByDateRange', () => {
    it('calls api.get with date range params', async () => {
      mockedApi.get.mockResolvedValueOnce([])

      await encounterService.getByDateRange('2024-01-01', '2024-01-31')

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/date-range', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
    })
  })

  describe('getByStatus', () => {
    it('calls api.get with status', async () => {
      mockedApi.get.mockResolvedValueOnce([])

      await encounterService.getByStatus('IN_PROGRESS')

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/status/IN_PROGRESS')
    })
  })

  describe('create', () => {
    it('calls api.post with encounter data', async () => {
      const encounter = {
        patientId: 1,
        encounterType: 'OUTPATIENT' as const,
        status: 'PLANNED' as const,
        encounterDateTime: '2024-01-15T09:00:00',
      }
      mockedApi.post.mockResolvedValueOnce({ id: 1, ...encounter })

      await encounterService.create(encounter)

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters', encounter)
    })
  })

  describe('update', () => {
    it('calls api.put with encounter data', async () => {
      const updates = { notes: 'Updated notes' }
      mockedApi.put.mockResolvedValueOnce({ id: 1, ...updates })

      await encounterService.update(1, updates)

      expect(mockedApi.put).toHaveBeenCalledWith('/v1/encounters/1', updates)
    })
  })

  describe('workflow actions', () => {
    it('checkIn calls post with correct endpoint', async () => {
      mockedApi.post.mockResolvedValueOnce(undefined)
      await encounterService.checkIn(1)
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/check-in')
    })

    it('start calls post with correct endpoint', async () => {
      mockedApi.post.mockResolvedValueOnce(undefined)
      await encounterService.start(1)
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/start')
    })

    it('complete calls post with notes', async () => {
      mockedApi.post.mockResolvedValueOnce(undefined)
      await encounterService.complete(1, 'Encounter complete')
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/complete', 'Encounter complete')
    })

    it('cancel calls post with correct endpoint', async () => {
      mockedApi.post.mockResolvedValueOnce(undefined)
      await encounterService.cancel(1)
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/cancel')
    })

    it('markNoShow calls post with correct endpoint', async () => {
      mockedApi.post.mockResolvedValueOnce(undefined)
      await encounterService.markNoShow(1)
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/no-show')
    })
  })
})
