import { patientService } from './patientService';
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

describe('patientService', () => {
  describe('getById', () => {
    it('calls api.get with correct patient endpoint', async () => {
      const patient = { id: 1, firstName: 'John', lastName: 'Smith' };
      mockApi.get.mockResolvedValueOnce(patient);

      const result = await patientService.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/1');
      expect(result).toEqual(patient);
    });
  });

  describe('getByMrn', () => {
    it('calls api.get with MRN endpoint', async () => {
      const patient = { id: 1, mrn: 'MRN001234' };
      mockApi.get.mockResolvedValueOnce(patient);

      const result = await patientService.getByMrn('MRN001234');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN001234');
      expect(result).toEqual(patient);
    });
  });

  describe('search', () => {
    it('calls api.get with search params', async () => {
      const page = { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 };
      mockApi.get.mockResolvedValueOnce(page);

      const result = await patientService.search('smith');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'smith', page: 0, size: 20 });
      expect(result).toEqual(page);
    });

    it('passes custom page and size params', async () => {
      mockApi.get.mockResolvedValueOnce({ content: [] });

      await patientService.search('doe', 2, 10);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'doe', page: 2, size: 10 });
    });
  });

  describe('create', () => {
    it('calls api.post with patient data', async () => {
      const newPatient = { firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1990-01-01' };
      const created = { id: 5, ...newPatient };
      mockApi.post.mockResolvedValueOnce(created);

      const result = await patientService.create(newPatient);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/patients', newPatient);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('calls api.put with patient id and data', async () => {
      const updates = { firstName: 'Janet' };
      const updated = { id: 5, firstName: 'Janet', lastName: 'Doe' };
      mockApi.put.mockResolvedValueOnce(updated);

      const result = await patientService.update(5, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/v1/patients/5', updates);
      expect(result).toEqual(updated);
    });
  });
});
