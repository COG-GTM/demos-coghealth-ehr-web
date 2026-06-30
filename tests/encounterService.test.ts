import { encounterService } from '../src/services/encounterService';
import { api } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

describe('encounterService', () => {
  it('getById hits the encounter-by-id endpoint', () => {
    encounterService.getById(7);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/7');
  });

  it('getByNumber hits the encounter-by-number endpoint', () => {
    encounterService.getByNumber('ENC-123');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/number/ENC-123');
  });

  it('getByPatient hits the patient encounters endpoint', () => {
    encounterService.getByPatient(42);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/patient/42');
  });

  it('getByProvider hits the provider encounters endpoint', () => {
    encounterService.getByProvider(3);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/3');
  });

  it('getProviderSchedule passes the date param', () => {
    encounterService.getProviderSchedule(3, '2026-01-01');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/3/schedule', { date: '2026-01-01' });
  });

  it('getByDateRange passes start and end dates', () => {
    encounterService.getByDateRange('2026-01-01', '2026-01-31');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/date-range', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
  });

  it('getByStatus hits the status endpoint', () => {
    encounterService.getByStatus('SCHEDULED');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/status/SCHEDULED');
  });

  it('create posts the encounter payload', () => {
    const payload = { patientId: 1 };
    encounterService.create(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters', payload);
  });

  it('update puts the encounter payload by id', () => {
    const payload = { status: 'FINISHED' as const };
    encounterService.update(9, payload);
    expect(mockedApi.put).toHaveBeenCalledWith('/v1/encounters/9', payload);
  });

  it('checkIn posts to the check-in endpoint', () => {
    encounterService.checkIn(9);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/9/check-in');
  });

  it('start posts to the start endpoint', () => {
    encounterService.start(9);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/9/start');
  });

  it('complete posts notes when provided', () => {
    encounterService.complete(9, 'all good');
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/9/complete', 'all good');
  });

  it('complete posts undefined notes when omitted', () => {
    encounterService.complete(9);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/9/complete', undefined);
  });

  it('cancel posts to the cancel endpoint', () => {
    encounterService.cancel(9);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/9/cancel');
  });

  it('markNoShow posts to the no-show endpoint', () => {
    encounterService.markNoShow(9);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/9/no-show');
  });
});
