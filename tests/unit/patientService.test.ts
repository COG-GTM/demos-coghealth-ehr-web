import { patientService } from '../../src/services/patientService';
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

describe('patientService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('calls api.get with correct path', async () => {
      const patient = { id: 1, firstName: 'John', lastName: 'Doe', mrn: 'MRN001' };
      mockedApi.get.mockResolvedValue(patient);

      const result = await patientService.getById(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/1');
      expect(result).toEqual(patient);
    });
  });

  describe('getByMrn', () => {
    it('calls api.get with MRN path', async () => {
      const patient = { id: 1, mrn: 'MRN001' };
      mockedApi.get.mockResolvedValue(patient);

      const result = await patientService.getByMrn('MRN001');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/mrn/MRN001');
      expect(result).toEqual(patient);
    });
  });

  describe('search', () => {
    it('calls api.get with search params', async () => {
      const page = { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 };
      mockedApi.get.mockResolvedValue(page);

      await patientService.search('John');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'John', page: 0, size: 20 });
    });

    it('passes custom page and size', async () => {
      const page = { content: [], totalElements: 50, totalPages: 3, size: 10, number: 2 };
      mockedApi.get.mockResolvedValue(page);

      await patientService.search('Doe', 2, 10);

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/patients/search', { q: 'Doe', page: 2, size: 10 });
    });
  });

  describe('create', () => {
    it('calls api.post with patient data', async () => {
      const newPatient = { firstName: 'Jane', lastName: 'Smith' };
      const created = { id: 2, mrn: 'MRN002', ...newPatient };
      mockedApi.post.mockResolvedValue(created);

      const result = await patientService.create(newPatient);

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/patients', newPatient);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('calls api.put with id and patient data', async () => {
      const updateData = { firstName: 'Updated' };
      const updated = { id: 1, firstName: 'Updated', lastName: 'Doe' };
      mockedApi.put.mockResolvedValue(updated);

      const result = await patientService.update(1, updateData);

      expect(mockedApi.put).toHaveBeenCalledWith('/v1/patients/1', updateData);
      expect(result).toEqual(updated);
    });
  });
});
