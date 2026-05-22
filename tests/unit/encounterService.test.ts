import { encounterService } from '../../src/services/encounterService';
import { api } from '../../src/services/api';

jest.mock('../../src/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('encounterService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('calls correct endpoint', async () => {
      const encounter = { id: 1, encounterNumber: 'ENC-2026-000001' };
      mockedApi.get.mockResolvedValue(encounter);

      const result = await encounterService.getById(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/1');
      expect(result).toEqual(encounter);
    });
  });

  describe('getByNumber', () => {
    it('calls correct endpoint with encounter number', async () => {
      mockedApi.get.mockResolvedValue({ encounterNumber: 'ENC-2026-000001' });

      await encounterService.getByNumber('ENC-2026-000001');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/number/ENC-2026-000001');
    });
  });

  describe('getByPatient', () => {
    it('calls correct endpoint', async () => {
      mockedApi.get.mockResolvedValue([]);

      await encounterService.getByPatient(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/patient/1');
    });
  });

  describe('getByProvider', () => {
    it('calls correct endpoint', async () => {
      mockedApi.get.mockResolvedValue([]);

      await encounterService.getByProvider(5);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5');
    });
  });

  describe('getProviderSchedule', () => {
    it('calls correct endpoint with date param', async () => {
      mockedApi.get.mockResolvedValue([]);

      await encounterService.getProviderSchedule(5, '2026-05-22');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5/schedule', { date: '2026-05-22' });
    });
  });

  describe('getByDateRange', () => {
    it('calls correct endpoint with date params', async () => {
      mockedApi.get.mockResolvedValue([]);

      await encounterService.getByDateRange('2026-05-01', '2026-05-31');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/date-range', {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });
    });
  });

  describe('getByStatus', () => {
    it('calls correct endpoint', async () => {
      mockedApi.get.mockResolvedValue([]);

      await encounterService.getByStatus('SCHEDULED');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/status/SCHEDULED');
    });
  });

  describe('create', () => {
    it('sends POST with encounter data', async () => {
      const encounter = { encounterType: 'OUTPATIENT' as const };
      mockedApi.post.mockResolvedValue({ id: 1, ...encounter });

      await encounterService.create(encounter);

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters', encounter);
    });
  });

  describe('update', () => {
    it('sends PUT with id and data', async () => {
      const data = { status: 'IN_PROGRESS' as const };
      mockedApi.put.mockResolvedValue({ id: 1, ...data });

      await encounterService.update(1, data);

      expect(mockedApi.put).toHaveBeenCalledWith('/v1/encounters/1', data);
    });
  });

  describe('status transitions', () => {
    it('checkIn sends POST', async () => {
      mockedApi.post.mockResolvedValue(undefined);
      await encounterService.checkIn(1);
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/check-in');
    });

    it('start sends POST', async () => {
      mockedApi.post.mockResolvedValue(undefined);
      await encounterService.start(1);
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/start');
    });

    it('complete sends POST with optional notes', async () => {
      mockedApi.post.mockResolvedValue(undefined);
      await encounterService.complete(1, 'Visit completed');
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/complete', 'Visit completed');
    });

    it('cancel sends POST', async () => {
      mockedApi.post.mockResolvedValue(undefined);
      await encounterService.cancel(1);
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/cancel');
    });

    it('markNoShow sends POST', async () => {
      mockedApi.post.mockResolvedValue(undefined);
      await encounterService.markNoShow(1);
      expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/1/no-show');
    });
  });
});
