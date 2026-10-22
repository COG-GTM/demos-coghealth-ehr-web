export type Consciousness = 'A' | 'C' | 'V' | 'P' | 'U';

export interface VitalReading {
  id: number;
  timestamp: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  painLevel?: number;
  onSupplementalO2?: boolean;
  consciousness?: Consciousness;
  notes?: string;
  recordedBy: string;
  location: string;
}

export interface VitalSign {
  name: string;
  key: keyof VitalReading;
  unit: string;
  normalRange: { min: number; max: number };
  criticalLow?: number;
  criticalHigh?: number;
}
