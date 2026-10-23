import { api } from './api';
import type { Patient } from '../types';

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const patientService = {
  getById: (id: number) => 
    api.get<Patient>(`/v1/patients/${id}`),

  getByIds: (ids: number[]) =>
    api.post<Patient[]>('/v1/patients/batch', { ids }),

  getByMrn: (mrn: string) => 
    api.get<Patient>(`/v1/patients/mrn/${mrn}`),

  search: (query: string, page = 0, size = 20) => 
    api.get<Page<Patient>>('/v1/patients/search', { q: query, page, size }),

  create: (patient: Partial<Patient>) => 
    api.post<Patient>('/v1/patients', patient),

  update: (id: number, patient: Partial<Patient>) => 
    api.put<Patient>(`/v1/patients/${id}`, patient),
};
