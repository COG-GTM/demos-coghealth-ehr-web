import type { VitalReading } from '../types';

export type News2Risk = 'low' | 'low-medium' | 'medium' | 'high';

export interface News2Component {
  name: string;
  value: number | undefined;
  points: number;
}

export interface News2Result {
  total: number;
  risk: News2Risk;
  components: News2Component[];
  hasRedFlag: boolean;
  response: string;
}

function scoreRespiratoryRate(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value <= 8 || value >= 25) return 3;
  if (value <= 11) return 1;
  if (value <= 20) return 0;
  return 2;
}

function scoreSpo2(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value <= 91) return 3;
  if (value <= 93) return 2;
  if (value <= 95) return 1;
  return 0;
}

function scoreSystolic(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value <= 90 || value >= 220) return 3;
  if (value <= 100) return 2;
  if (value <= 110) return 1;
  return 0;
}

function scoreHeartRate(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value <= 40 || value >= 131) return 3;
  if (value <= 50) return 1;
  if (value <= 90) return 0;
  if (value <= 110) return 1;
  return 2;
}

function scoreTemperature(value: number | undefined): number {
  if (value === undefined) return 0;
  if (value <= 35.0) return 3;
  if (value <= 36.0) return 1;
  if (value <= 38.0) return 0;
  if (value <= 39.0) return 1;
  return 2;
}

export function calculateNews2(r: VitalReading): News2Result {
  const temperatureCelsius = r.temperature === undefined
    ? undefined
    : Math.round(((r.temperature - 32) * 5 / 9) * 10) / 10;
  const components: News2Component[] = [
    { name: 'Respiratory Rate', value: r.respiratoryRate, points: scoreRespiratoryRate(r.respiratoryRate) },
    { name: 'SpO2', value: r.spo2, points: scoreSpo2(r.spo2) },
    { name: 'Air/O2', value: undefined, points: 0 },
    { name: 'Systolic BP', value: r.systolic, points: scoreSystolic(r.systolic) },
    { name: 'Heart Rate', value: r.heartRate, points: scoreHeartRate(r.heartRate) },
    { name: 'Consciousness', value: undefined, points: 0 },
    { name: 'Temperature', value: temperatureCelsius, points: scoreTemperature(temperatureCelsius) },
  ];
  const total = components.reduce((sum, component) => sum + component.points, 0);
  const hasRedFlag = components.some(component => component.points === 3);
  const risk: News2Risk = total >= 7
    ? 'high'
    : total >= 5
      ? 'medium'
      : hasRedFlag
        ? 'low-medium'
        : 'low';
  const response = {
    low: 'Routine monitoring (min. 12-hourly)',
    'low-medium': 'Urgent ward-based review',
    medium: 'Urgent response — clinician review within 30 min',
    high: 'Emergency response — critical care team',
  }[risk];

  return { total, risk, components, hasRedFlag, response };
}
