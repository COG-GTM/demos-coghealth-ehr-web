import { api } from './api';
import type {
  AtRiskPatient,
  CareGap,
  ChronicCondition,
  ChronicDashboardSummary,
  EnrollmentRequest,
  MedicationAdherence,
} from '../types';

export const chronicService = {
  getPatientConditions: (patientId: number) =>
    api.get<ChronicCondition[]>(`/v1/chronic/conditions/patient/${patientId}`),

  enrollPatient: (data: EnrollmentRequest) =>
    api.post<ChronicCondition>('/v1/chronic/conditions/enroll', data),

  getCareGaps: (patientId: number, conditionId: number) =>
    api.get<CareGap[]>(
      `/v1/chronic/care-gaps/patient/${patientId}/condition/${conditionId}`,
    ),

  getPatientAdherence: (patientId: number) =>
    api.get<MedicationAdherence[]>(`/v1/chronic/adherence/patient/${patientId}`),

  getAtRiskPatients: () =>
    api.get<AtRiskPatient[]>('/v1/chronic/at-risk-patients'),

  getDashboardSummary: () =>
    api.get<ChronicDashboardSummary>('/v1/chronic/dashboard/summary'),
};
