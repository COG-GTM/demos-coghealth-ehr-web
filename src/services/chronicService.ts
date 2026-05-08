import { api } from './api';
import type {
  AtRiskPatient,
  CareGap,
  ChronicCondition,
  ChronicDashboardSummary,
  MedicationAdherence,
} from '../types/chronic';

export const chronicService = {
  getDashboardSummary: () =>
    api.get<ChronicDashboardSummary>('/v1/chronic/dashboard/summary'),

  getAtRiskPatients: () =>
    api.get<AtRiskPatient[]>('/v1/chronic/at-risk-patients'),

  getCareGaps: () =>
    api.get<CareGap[]>('/v1/chronic/care-gaps'),

  getPatientConditions: (patientId: number) =>
    api.get<ChronicCondition[]>(`/v1/chronic/patients/${patientId}/conditions`),

  getPatientAdherence: (patientId: number) =>
    api.get<MedicationAdherence[]>(`/v1/chronic/patients/${patientId}/adherence`),

  identifyCareGaps: (patientId: number) =>
    api.get<CareGap[]>(`/v1/chronic/patients/${patientId}/care-gaps`),
};
