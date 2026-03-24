import { patientService } from '../../services/patientService';
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

describe('patientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getById calls api.get with /v1/patients/:id', async () => {
    mockedApi.get.mockResolvedValue({ id: 123 });

    await patientService.getById(123);

    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/123');
  });

  test('getByMrn calls api.get with /v1/patients/mrn/:mrn', async () => {
    mockedApi.get.mockResolvedValue({ mrn: 'MRN001' });

    await patientService.getByMrn('MRN001');

    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN001');
  });

  test('search calls api.get with /v1/patients/search and correct params', async () => {
    mockedApi.get.mockResolvedValue({ content: [], totalElements: 0 });

    await patientService.search('Smith', 0, 20);

    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', {
      q: 'Smith',
      page: 0,
      size: 20,
    });
  });

  test('create calls api.post with /v1/patients and patient data', async () => {
    const patientData = { firstName: 'John', lastName: 'Doe' };
    mockedApi.post.mockResolvedValue({ id: 1, ...patientData });

    await patientService.create(patientData);

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/patients', patientData);
  });

  test('update calls api.put with /v1/patients/:id and patient data', async () => {
    const patientData = { firstName: 'Jane' };
    mockedApi.put.mockResolvedValue({ id: 123, ...patientData });

    await patientService.update(123, patientData);

    expect(mockedApi.put).toHaveBeenCalledWith('/v1/patients/123', patientData);
  });
});
