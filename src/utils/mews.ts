import type { VitalReading } from '../types/vitals';

export type MewsRiskLevel = 'low' | 'medium' | 'high';

export interface MewsComponents {
  systolic: number;
  heartRate: number;
  respiratoryRate: number;
  temperature: number;
}

export interface MewsResult {
  score: number;
  components: MewsComponents;
}

export function computeMews(reading: VitalReading): MewsResult {
  const components: MewsComponents = {
    systolic: scoreSystolic(reading.systolic),
    heartRate: scoreHeartRate(reading.heartRate),
    respiratoryRate: scoreRespiratoryRate(reading.respiratoryRate),
    temperature: scoreTemperature(reading.temperature),
  };

  return {
    score: Object.values(components).reduce((total, component) => total + component, 0),
    components,
  };
}

export function riskLevel(score: number): MewsRiskLevel {
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function scoreSystolic(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value <= 70) return 3;
  if (value <= 80) return 2;
  if (value <= 100) return 1;
  if (value >= 200) return 2;
  return 0;
}

function scoreHeartRate(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value < 40) return 2;
  if (value <= 50) return 1;
  if (value <= 100) return 0;
  if (value <= 110) return 1;
  if (value <= 129) return 2;
  return 3;
}

function scoreRespiratoryRate(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value < 9) return 2;
  if (value <= 14) return 0;
  if (value <= 20) return 1;
  if (value <= 29) return 2;
  return 3;
}

function scoreTemperature(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value < 95) return 2;
  if (value <= 96.8) return 1;
  if (value <= 100.4) return 0;
  return 2;
}
