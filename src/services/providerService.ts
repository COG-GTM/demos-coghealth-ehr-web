import { api } from './api';
import type { Provider } from '../types';

export const providerService = {
  getAll: () =>
    api.get<Provider[]>('/v1/providers'),

  getById: (id: number) =>
    api.get<Provider>(`/v1/providers/${id}`),

  search: (lastName: string) =>
    api.get<Provider[]>('/v1/providers/search', { lastName }),

  listDepartments: () =>
    api.get<string[]>('/v1/providers/departments'),

  listSpecialties: () =>
    api.get<string[]>('/v1/providers/specialties'),
};
