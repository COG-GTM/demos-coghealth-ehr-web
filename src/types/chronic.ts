export type ChronicConditionType =
  | 'DIABETES_TYPE_1'
  | 'DIABETES_TYPE_2'
  | 'HYPERTENSION'
  | 'COPD'
  | 'CHF'
  | 'CKD'
  | 'ASTHMA'
  | 'OBESITY'
  | 'HYPERLIPIDEMIA'
  | 'ATRIAL_FIBRILLATION';

export type ConditionSeverity = 'MILD' | 'MODERATE' | 'SEVERE';

export type ConditionStatus = 'ACTIVE' | 'CONTROLLED' | 'UNCONTROLLED' | 'RESOLVED' | 'INACTIVE';

export type AdherenceStatus = 'ADHERENT' | 'PARTIALLY_ADHERENT' | 'NON_ADHERENT' | 'UNKNOWN';

export type CareGapPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ChronicCondition {
  id: number;
  patientId: number;
  conditionType: ChronicConditionType;
  icd10Code?: string;
  diagnosisDate?: string;
  severity?: ConditionSeverity;
  status?: ConditionStatus;
  notes?: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  managingProviderId?: number;
  enrolledInProgram: boolean;
  programEnrollmentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicationAdherence {
  id: number;
  patientId: number;
  medicationOrderId: number;
  chronicConditionId?: number;
  periodStart: string;
  periodEnd: string;
  pdcScore?: number;
  daysSupply?: number;
  daysCovered?: number;
  refillsOnTime?: number;
  refillsLate?: number;
  refillsMissed?: number;
  adherenceStatus?: AdherenceStatus;
  lastFillDate?: string;
  nextFillDue?: string;
  pharmacyNpi?: string;
  pharmacyName?: string;
  alertSent?: boolean;
  alertSentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AtRiskPatient {
  patientId: number;
  patientMrn?: string;
  patientName: string;
  conditionType?: ChronicConditionType;
  medicationName?: string;
  currentPdc?: number;
  adherenceStatus?: AdherenceStatus;
  lastFillDate?: string;
  nextFillDue?: string;
  daysOverdue?: number;
  riskReason?: string;
}

export interface CareGap {
  patientId?: number;
  patientName?: string;
  gapType: string;
  description: string;
  priority: CareGapPriority;
  recommendation?: string;
  dueDate?: string;
  conditionType?: ChronicConditionType;
}

export interface AdherenceDistribution {
  adherent: number;
  partiallyAdherent: number;
  nonAdherent: number;
  unknown: number;
}

export interface ChronicDashboardSummary {
  totalEnrolled: number;
  atRiskCount: number;
  openCareGaps: number;
  averagePdc?: number;
  adherenceDistribution?: AdherenceDistribution;
}
