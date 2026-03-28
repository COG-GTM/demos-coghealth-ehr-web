import { api } from './api';
import type { ProviderAvailability } from '../types/availability';

export const providerAvailabilityService = {
  getAll: (providerId: number) =>
    api.get<ProviderAvailability[]>(`/v1/providers/${providerId}/availability`),

  getById: (providerId: number, id: number) =>
    api.get<ProviderAvailability>(`/v1/providers/${providerId}/availability/${id}`),

  getRecurring: (providerId: number) =>
    api.get<ProviderAvailability[]>(`/v1/providers/${providerId}/availability/recurring`),

  getByDate: (providerId: number, date: string) =>
    api.get<ProviderAvailability[]>(`/v1/providers/${providerId}/availability/date/${date}`),

  getEffective: (providerId: number, date: string) =>
    api.get<ProviderAvailability[]>(`/v1/providers/${providerId}/availability/effective`, { date }),

  getByDateRange: (providerId: number, startDate: string, endDate: string) =>
    api.get<ProviderAvailability[]>(`/v1/providers/${providerId}/availability/range`, { startDate, endDate }),

  create: (providerId: number, data: Partial<ProviderAvailability>) =>
    api.post<ProviderAvailability>(`/v1/providers/${providerId}/availability`, data),

  update: (providerId: number, id: number, data: Partial<ProviderAvailability>) =>
    api.put<ProviderAvailability>(`/v1/providers/${providerId}/availability/${id}`, data),

  delete: (providerId: number, id: number) =>
    api.delete<void>(`/v1/providers/${providerId}/availability/${id}`),
};
