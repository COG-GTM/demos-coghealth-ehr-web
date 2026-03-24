import { encounterService } from '../../services/encounterService';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('encounterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getByPatient calls api.get with /v1/encounters/patient/:patientId', async () => {
    mockedApi.get.mockResolvedValue([]);

    await encounterService.getByPatient(42);

    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/patient/42');
  });

  test('checkIn calls api.post with /v1/encounters/:id/check-in', async () => {
    mockedApi.post.mockResolvedValue(undefined);

    await encounterService.checkIn(5);

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/5/check-in');
  });

  test('start calls api.post with /v1/encounters/:id/start', async () => {
    mockedApi.post.mockResolvedValue(undefined);

    await encounterService.start(5);

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/5/start');
  });

  test('complete calls api.post with /v1/encounters/:id/complete and notes', async () => {
    mockedApi.post.mockResolvedValue(undefined);

    await encounterService.complete(5, 'Notes here');

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/5/complete', 'Notes here');
  });

  test('cancel calls api.post with /v1/encounters/:id/cancel', async () => {
    mockedApi.post.mockResolvedValue(undefined);

    await encounterService.cancel(5);

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/5/cancel');
  });

  test('markNoShow calls api.post with /v1/encounters/:id/no-show', async () => {
    mockedApi.post.mockResolvedValue(undefined);

    await encounterService.markNoShow(5);

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/encounters/5/no-show');
  });

  test('getProviderSchedule calls api.get with correct path and date param', async () => {
    mockedApi.get.mockResolvedValue([]);

    await encounterService.getProviderSchedule(10, '2024-01-15');

    expect(mockedApi.get).toHaveBeenCalledWith('/v1/encounters/provider/10/schedule', {
      date: '2024-01-15',
    });
  });
});
