import { encounterService } from '../src/services/encounterService';
import { api } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

describe('encounterService reads', () => {
  it('getById hits the encounter-by-id endpoint', () => {
    encounterService.getById(3);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/3');
  });

  it('getByNumber hits the encounter-by-number endpoint', () => {
    encounterService.getByNumber('ENC-42');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/number/ENC-42');
  });

  it('getByPatient hits the by-patient endpoint', () => {
    encounterService.getByPatient(11);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/patient/11');
  });

  it('getByProvider hits the by-provider endpoint', () => {
    encounterService.getByProvider(5);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5');
  });

  it('getProviderSchedule passes the date param', () => {
    encounterService.getProviderSchedule(5, '2026-01-01');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/5/schedule', {
      date: '2026-01-01',
    });
  });

  it('getByDateRange passes start and end params', () => {
    encounterService.getByDateRange('2026-01-01', '2026-01-31');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/date-range', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
  });

  it('getByStatus hits the by-status endpoint', () => {
    encounterService.getByStatus('IN_PROGRESS');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/status/IN_PROGRESS');
  });
});

describe('encounterService writes', () => {
  it('create posts the encounter payload', () => {
    const payload = { patientId: 1 };
    encounterService.create(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters', payload);
  });

  it('update puts the encounter payload for the given id', () => {
    const payload = { chiefComplaint: 'follow-up' };
    encounterService.update(4, payload);
    expect(mockedApi.put).toHaveBeenCalledWith('/v1/encounters/4', payload);
  });

  it('checkIn posts to the check-in endpoint', () => {
    encounterService.checkIn(4);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/4/check-in');
  });

  it('start posts to the start endpoint', () => {
    encounterService.start(4);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/4/start');
  });

  it('complete posts optional notes to the complete endpoint', () => {
    encounterService.complete(4, 'all good');
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/4/complete', 'all good');
  });

  it('complete works without notes', () => {
    encounterService.complete(4);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/4/complete', undefined);
  });

  it('cancel posts to the cancel endpoint', () => {
    encounterService.cancel(4);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/4/cancel');
  });

  it('markNoShow posts to the no-show endpoint', () => {
    encounterService.markNoShow(4);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/4/no-show');
  });
});
