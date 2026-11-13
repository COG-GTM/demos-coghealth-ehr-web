export interface LabResult {
  id: number;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  collectedAt: string;
  resultedAt: string;
  orderedBy: string;
  performingLab: string;
}

export interface LabAcknowledgment {
  panelId: number;
  acknowledgedBy: string;
  acknowledgedAt: string;
  note: string;
  criticalFingerprint: string;
}

export interface LabPanel {
  id: number;
  panelName: string;
  patientName: string;
  patientMrn: string;
  collectedAt: string;
  resultedAt: string;
  status: 'final' | 'preliminary' | 'pending';
  results: LabResult[];
}
