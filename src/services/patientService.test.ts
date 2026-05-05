jest.mock('./api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { patientService } from './patientService';
import { api } from './api';

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('patientService', () => {
  describe('search', () => {
    it('calls api.get with /v1/patients/search and correct params', async () => {
      const mockResult = { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 };
      mockedApi.get.mockResolvedValueOnce(mockResult);

      const result = await patientService.search('smith', 0, 20);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'smith', page: 0, size: 20 });
      expect(result).toEqual(mockResult);
    });

    it('uses default page and size parameters', async () => {
      mockedApi.get.mockResolvedValueOnce({ content: [] });

      await patientService.search('jones');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'jones', page: 0, size: 20 });
    });
  });

  describe('getById', () => {
    it('calls api.get with /v1/patients/{id}', async () => {
      const mockPatient = { id: 1, firstName: 'John', lastName: 'Smith' };
      mockedApi.get.mockResolvedValueOnce(mockPatient);

      const result = await patientService.getById(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/1');
      expect(result).toEqual(mockPatient);
    });
  });

  describe('getByMrn', () => {
    it('calls api.get with /v1/patients/mrn/{mrn}', async () => {
      const mockPatient = { id: 1, mrn: 'MRN001' };
      mockedApi.get.mockResolvedValueOnce(mockPatient);

      const result = await patientService.getByMrn('MRN001');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN001');
      expect(result).toEqual(mockPatient);
    });
  });

  describe('create', () => {
    it('calls api.post with /v1/patients and patient data', async () => {
      const newPatient = { firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1990-01-01' };
      mockedApi.post.mockResolvedValueOnce({ id: 10, ...newPatient });

      const result = await patientService.create(newPatient);

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/patients', newPatient);
      expect(result).toEqual({ id: 10, ...newPatient });
    });
  });

  describe('update', () => {
    it('calls api.put with /v1/patients/{id} and patient data', async () => {
      const updates = { firstName: 'Johnny' };
      mockedApi.put.mockResolvedValueOnce({ id: 1, ...updates });

      const result = await patientService.update(1, updates);

      expect(mockedApi.put).toHaveBeenCalledWith('/v1/patients/1', updates);
      expect(result).toEqual({ id: 1, ...updates });
    });
  });
});
