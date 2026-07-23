import { patientService } from '../src/services/patientService';
import { api } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

describe('patientService', () => {
  it('getById hits the patient-by-id endpoint', () => {
    patientService.getById(7);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/7');
  });

  it('getByMrn hits the patient-by-mrn endpoint', () => {
    patientService.getByMrn('MRN123');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN123');
  });

  it('search passes the query with default pagination', () => {
    patientService.search('diabetes');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', {
      q: 'diabetes',
      page: 0,
      size: 20,
    });
  });

  it('search passes explicit pagination values', () => {
    patientService.search('smith', 2, 50);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', {
      q: 'smith',
      page: 2,
      size: 50,
    });
  });

  it('create posts the patient payload', () => {
    const payload = { firstName: 'Jane', lastName: 'Doe' };
    patientService.create(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/patients', payload);
  });

  it('update puts the patient payload for the given id', () => {
    const payload = { firstName: 'Jane' };
    patientService.update(9, payload);
    expect(mockedApi.put).toHaveBeenCalledWith('/v1/patients/9', payload);
  });
});
