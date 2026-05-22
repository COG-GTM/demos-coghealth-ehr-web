import { encounterService } from './encounterService';
import { api } from './api';

jest.mock('./api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('encounterService', () => {
  describe('getById', () => {
    it('fetches encounter by id', async () => {
      const encounter = { id: 1, patientId: 10 };
      mockApi.get.mockResolvedValueOnce(encounter);

      const result = await encounterService.getById(1);
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/1');
      expect(result).toEqual(encounter);
    });
  });

  describe('getByNumber', () => {
    it('fetches encounter by encounter number', async () => {
      mockApi.get.mockResolvedValueOnce({ encounterNumber: 'ENC-001' });

      await encounterService.getByNumber('ENC-001');
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/number/ENC-001');
    });
  });

  describe('getByPatient', () => {
    it('fetches encounters for a patient', async () => {
      mockApi.get.mockResolvedValueOnce([]);

      await encounterService.getByPatient(10);
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/patient/10');
    });
  });

  describe('getByProvider', () => {
    it('fetches encounters for a provider', async () => {
      mockApi.get.mockResolvedValueOnce([]);

      await encounterService.getByProvider(5);
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5');
    });
  });

  describe('getProviderSchedule', () => {
    it('fetches provider schedule for a specific date', async () => {
      mockApi.get.mockResolvedValueOnce([]);

      await encounterService.getProviderSchedule(5, '2024-01-15');
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5/schedule', { date: '2024-01-15' });
    });
  });

  describe('getByDateRange', () => {
    it('fetches encounters within a date range', async () => {
      mockApi.get.mockResolvedValueOnce([]);

      await encounterService.getByDateRange('2024-01-01', '2024-01-31');
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/date-range', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });
  });

  describe('getByStatus', () => {
    it('fetches encounters by status', async () => {
      mockApi.get.mockResolvedValueOnce([]);

      await encounterService.getByStatus('IN_PROGRESS');
      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/status/IN_PROGRESS');
    });
  });

  describe('create', () => {
    it('creates a new encounter', async () => {
      const data = { patientId: 10, encounterType: 'OUTPATIENT' as const, status: 'PLANNED' as const, encounterDateTime: '2024-01-15T09:00:00' };
      mockApi.post.mockResolvedValueOnce({ id: 1, ...data });

      const result = await encounterService.create(data);
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('update', () => {
    it('updates an existing encounter', async () => {
      const updates = { notes: 'Follow-up needed' };
      mockApi.put.mockResolvedValueOnce({ id: 1, ...updates });

      await encounterService.update(1, updates);
      expect(mockApi.put).toHaveBeenCalledWith('/v1/encounters/1', updates);
    });
  });

  describe('status transitions', () => {
    it('checks in an encounter', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);
      await encounterService.checkIn(1);
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/check-in');
    });

    it('starts an encounter', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);
      await encounterService.start(1);
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/start');
    });

    it('completes an encounter with notes', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);
      await encounterService.complete(1, 'Patient discharged');
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/complete', 'Patient discharged');
    });

    it('completes an encounter without notes', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);
      await encounterService.complete(1);
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/complete', undefined);
    });

    it('cancels an encounter', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);
      await encounterService.cancel(1);
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/cancel');
    });

    it('marks an encounter as no-show', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);
      await encounterService.markNoShow(1);
      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/no-show');
    });
  });
});
