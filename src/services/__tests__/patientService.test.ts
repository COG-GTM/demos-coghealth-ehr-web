import { patientService } from '../patientService';
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

describe('patientService', () => {
  const samplePatient = {
    id: 1,
    mrn: 'MRN001',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'MALE' as const,
  };

  describe('getById', () => {
    it('should call GET /v1/patients/:id', async () => {
      mockApi.get.mockResolvedValueOnce(samplePatient);

      const result = await patientService.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/1');
      expect(result).toEqual(samplePatient);
    });
  });

  describe('getByMrn', () => {
    it('should call GET /v1/patients/mrn/:mrn', async () => {
      mockApi.get.mockResolvedValueOnce(samplePatient);

      const result = await patientService.getByMrn('MRN001');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN001');
      expect(result).toEqual(samplePatient);
    });
  });

  describe('search', () => {
    it('should call GET /v1/patients/search with query params', async () => {
      const page = { content: [samplePatient], totalElements: 1, totalPages: 1, size: 20, number: 0 };
      mockApi.get.mockResolvedValueOnce(page);

      const result = await patientService.search('Doe', 0, 20);

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'Doe', page: 0, size: 20 });
      expect(result).toEqual(page);
    });

    it('should use default page=0, size=20', async () => {
      mockApi.get.mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });

      await patientService.search('Smith');

      expect(mockApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'Smith', page: 0, size: 20 });
    });
  });

  describe('create', () => {
    it('should call POST /v1/patients with patient data', async () => {
      const newPatient = { firstName: 'Jane', lastName: 'Smith', dateOfBirth: '1985-05-15' };
      mockApi.post.mockResolvedValueOnce({ id: 2, mrn: 'MRN002', ...newPatient });

      const result = await patientService.create(newPatient);

      expect(mockApi.post).toHaveBeenCalledWith('/v1/patients', newPatient);
      expect(result).toEqual(expect.objectContaining({ id: 2, mrn: 'MRN002' }));
    });
  });

  describe('update', () => {
    it('should call PUT /v1/patients/:id with updated data', async () => {
      const updates = { firstName: 'Jonathan' };
      mockApi.put.mockResolvedValueOnce({ ...samplePatient, ...updates });

      const result = await patientService.update(1, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/v1/patients/1', updates);
      expect(result).toEqual(expect.objectContaining({ firstName: 'Jonathan' }));
    });
  });
});
