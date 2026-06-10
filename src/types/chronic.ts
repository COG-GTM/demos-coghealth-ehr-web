// Enums matching the Java enums in com.medchart.ehr.domain.chronic

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

export type ConditionSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export type ConditionStatus =
  | 'ACTIVE'
  | 'CONTROLLED'
  | 'UNCONTROLLED'
  | 'IN_REMISSION'
  | 'RESOLVED';

export type AdherenceStatus =
  | 'ADHERENT'
  | 'PARTIALLY_ADHERENT'
  | 'NON_ADHERENT'
  | 'UNKNOWN';

export type ControlStatus =
  | 'CONTROLLED'
  | 'SUBOPTIMAL'
  | 'UNCONTROLLED'
  | 'UNKNOWN';

export type CareGapPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// Domain interfaces matching JPA entities

export interface ChronicCondition {
  id?: number;
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
  enrolledInProgram?: boolean;
  programEnrollmentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicationAdherence {
  id?: number;
  patientId: number;
  medicationOrderId: number;
  chronicConditionId?: number;
  periodStart: string;
  periodEnd: string;
  /** Proportion of Days Covered (PDC); >= 0.80 is considered adherent. */
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

export interface DiabetesManagement {
  id?: number;
  patientId: number;
  chronicConditionId: number;
  // HbA1c tracking
  lastHba1cValue?: number;
  lastHba1cDate?: string;
  targetHba1c?: number;
  hba1cControlStatus?: ControlStatus;
  // Blood glucose monitoring
  usesCgm?: boolean;
  cgmDeviceType?: string;
  avgDailyGlucose?: number;
  timeInRangePercent?: number;
  // Insulin management
  onInsulin?: boolean;
  insulinRegimen?: string;
  usesInsulinPump?: boolean;
  pumpType?: string;
  // Complications screening
  lastEyeExamDate?: string;
  lastFootExamDate?: string;
  lastNephropathyScreenDate?: string;
  hasRetinopathy?: boolean;
  hasNeuropathy?: boolean;
  hasNephropathy?: boolean;
  // Quality measures
  statinPrescribed?: boolean;
  aceArbPrescribed?: boolean;
  lastLipidPanelDate?: string;
  lastBpReading?: string;
  lastBpDate?: string;
  // Education & self-management
  completedDsme?: boolean;
  dsmeCompletionDate?: string;
  hasNutritionist?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// DTO interfaces matching service inner classes

export interface CareGap {
  gapType: string;
  description: string;
  priority: CareGapPriority;
  recommendation: string;
  dueDate?: string;
}

export interface AtRiskPatient {
  patientId: number;
  patientMrn: string;
  patientName: string;
  medicationName: string;
  currentPdc?: number;
  lastFillDate?: string;
  nextFillDue?: string;
  riskReason: string;
}

export interface ChronicDashboardSummary {
  totalEnrolled: number;
  avgPdc: number;
  careGapCount: number;
  atRiskCount: number;
}

// Request payload for enrolling a patient in a chronic disease program.
export interface EnrollmentRequest {
  patientId: number;
  conditionType: ChronicConditionType;
  icd10Code?: string;
  managingProviderId?: number;
}
