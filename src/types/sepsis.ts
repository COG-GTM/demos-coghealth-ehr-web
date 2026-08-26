export type SepsisRiskLevel = 'low' | 'moderate' | 'high';

export type SepsisCriterionSet = 'SIRS' | 'qSOFA' | 'MEWS';

export interface SepsisCriterion {
  set: SepsisCriterionSet;
  label: string;
  detail: string;
  met: boolean;
  points: number;
  documented: boolean;
}

export interface SepsisAssessment {
  readingId: number;
  timestamp: string;
  sirsCount: number;
  qsofaScore: number;
  mewsScore: number;
  riskLevel: SepsisRiskLevel;
  /** MEWS change versus the next-older reading; 0 when there is no prior reading. */
  mewsDelta: number;
  recommendation: string;
  criteria: SepsisCriterion[];
  undocumented: string[];
}

export interface SepsisRiskSummary {
  current: SepsisAssessment;
  history: SepsisAssessment[];
  mewsDelta: number;
  recommendation: string;
}

export interface SepsisBundleOrder {
  id: string;
  name: string;
  detail: string;
  category: 'lab' | 'medication' | 'fluid' | 'monitoring';
  defaultSelected: boolean;
}
