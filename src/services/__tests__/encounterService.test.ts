import { encounterService } from '../encounterService';
import { api } from '../api';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('encounterService', () => {
  const sampleEncounter = {
    id: 1,
    encounterNumber: 'ENC-2026-000001',
    patientId: 100,
    encounterType: 'OUTPATIENT' as const,
    status: 'PLANNED' as const,
    encounterDateTime: '2026-04-30T09:00:00',
  };

  describe('getById', () => {
    it('should call GET /v1/encounters/:id', async () => {
      mockApi.get.mockResolvedValueOnce(sampleEncounter);

      const result = await encounterService.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/1');
      expect(result).toEqual(sampleEncounter);
    });
  });

  describe('getByNumber', () => {
    it('should call GET /v1/encounters/number/:number', async () => {
      mockApi.get.mockResolvedValueOnce(sampleEncounter);

      const result = await encounterService.getByNumber('ENC-2026-000001');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/number/ENC-2026-000001');
      expect(result).toEqual(sampleEncounter);
    });
  });

  describe('getByPatient', () => {
    it('should call GET /v1/encounters/patient/:patientId', async () => {
      mockApi.get.mockResolvedValueOnce([sampleEncounter]);

      const result = await encounterService.getByPatient(100);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/patient/100');
      expect(result).toEqual([sampleEncounter]);
    });
  });

  describe('getByProvider', () => {
    it('should call GET /v1/encounters/provider/:providerId', async () => {
      mockApi.get.mockResolvedValueOnce([sampleEncounter]);

      const result = await encounterService.getByProvider(5);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5');
      expect(result).toEqual([sampleEncounter]);
    });
  });

  describe('getProviderSchedule', () => {
    it('should call GET with provider ID and date param', async () => {
      mockApi.get.mockResolvedValueOnce([sampleEncounter]);

      const result = await encounterService.getProviderSchedule(5, '2026-04-30');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5/schedule', { date: '2026-04-30' });
      expect(result).toEqual([sampleEncounter]);
    });
  });

  describe('getByDateRange', () => {
    it('should call GET with startDate and endDate params', async () => {
      mockApi.get.mockResolvedValueOnce([sampleEncounter]);

      const result = await encounterService.getByDateRange('2026-04-01', '2026-04-30');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/date-range', {
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });
      expect(result).toEqual([sampleEncounter]);
    });
  });

  describe('getByStatus', () => {
    it('should call GET /v1/encounters/status/:status', async () => {
      mockApi.get.mockResolvedValueOnce([sampleEncounter]);

      const result = await encounterService.getByStatus('IN_PROGRESS');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/encounters/status/IN_PROGRESS');
      expect(result).toEqual([sampleEncounter]);
    });
  });

  describe('create', () => {
    it('should call POST /v1/encounters', async () => {
      const newEncounter = {
        patientId: 100,
        encounterType: 'OUTPATIENT' as const,
        status: 'PLANNED' as const,
        encounterDateTime: '2026-05-01T10:00:00',
      };
      mockApi.post.mockResolvedValueOnce({ id: 2, ...newEncounter });

      const result = await encounterService.create(newEncounter);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters', newEncounter);
      expect(result).toEqual(expect.objectContaining({ id: 2 }));
    });
  });

  describe('update', () => {
    it('should call PUT /v1/encounters/:id', async () => {
      const updates = { notes: 'Follow-up needed' };
      mockApi.put.mockResolvedValueOnce({ ...sampleEncounter, ...updates });

      const result = await encounterService.update(1, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/v1/encounters/1', updates);
      expect(result).toEqual(expect.objectContaining({ notes: 'Follow-up needed' }));
    });
  });

  describe('workflow transitions', () => {
    it('checkIn should call POST /v1/encounters/:id/check-in', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);

      await encounterService.checkIn(1);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/check-in');
    });

    it('start should call POST /v1/encounters/:id/start', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);

      await encounterService.start(1);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/start');
    });

    it('complete should call POST /v1/encounters/:id/complete with notes', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);

      await encounterService.complete(1, 'Patient discharged');

      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/complete', 'Patient discharged');
    });

    it('cancel should call POST /v1/encounters/:id/cancel', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);

      await encounterService.cancel(1);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/cancel');
    });

    it('markNoShow should call POST /v1/encounters/:id/no-show', async () => {
      mockApi.post.mockResolvedValueOnce(undefined);

      await encounterService.markNoShow(1);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/encounters/1/no-show');
    });
  });
});
