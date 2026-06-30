import { patientService } from '../src/services/patientService';
import { api } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

describe('patientService', () => {
  it('getById hits the patient-by-id endpoint', () => {
    patientService.getById(5);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/5');
  });

  it('getByMrn hits the patient-by-mrn endpoint', () => {
    patientService.getByMrn('MRN-001');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN-001');
  });

  it('search uses default page and size', () => {
    patientService.search('smith');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'smith', page: 0, size: 20 });
  });

  it('search passes explicit page and size', () => {
    patientService.search('smith', 2, 50);
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'smith', page: 2, size: 50 });
  });

  it('create posts the patient payload', () => {
    const payload = { firstName: 'Jane' };
    patientService.create(payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/v1/patients', payload);
  });

  it('update puts the patient payload by id', () => {
    const payload = { lastName: 'Doe' };
    patientService.update(5, payload);
    expect(mockedApi.put).toHaveBeenCalledWith('/v1/patients/5', payload);
  });
});
