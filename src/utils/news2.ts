import type { VitalReading, ConsciousnessLevel } from '../types/vitals';

// National Early Warning Score 2 (Royal College of Physicians, 2017), SpO2 Scale 1.

export type News2Parameter =
  | 'respiratoryRate'
  | 'spo2'
  | 'supplementalO2'
  | 'systolic'
  | 'heartRate'
  | 'consciousness'
  | 'temperature';

export type News2Risk = 'none' | 'low' | 'low-medium' | 'medium' | 'high';

export interface News2Component {
  parameter: News2Parameter;
  label: string;
  display: string;
  points: number;
  assumed: boolean;
}

export interface News2Result {
  total: number;
  risk: News2Risk;
  components: News2Component[];
  missing: News2Parameter[];
  hasRedScore: boolean;
}

export interface News2Response {
  label: string;
  frequency: string;
  action: string;
}

export const CONSCIOUSNESS_LABELS: Record<ConsciousnessLevel, string> = {
  A: 'Alert',
  C: 'New confusion',
  V: 'Responds to voice',
  P: 'Responds to pain',
  U: 'Unresponsive',
};

export const NEWS2_RESPONSE: Record<News2Risk, News2Response> = {
  none: {
    label: 'Low',
    frequency: 'Minimum 12-hourly',
    action: 'Continue routine NEWS2 monitoring.',
  },
  low: {
    label: 'Low',
    frequency: 'Minimum 4–6 hourly',
    action: 'Inform registered nurse to assess the patient and decide on frequency of monitoring or escalation.',
  },
  'low-medium': {
    label: 'Low–Medium',
    frequency: 'Minimum 1-hourly',
    action: 'Single parameter scoring 3: urgent ward-based review by a clinician competent in acute illness.',
  },
  medium: {
    label: 'Medium',
    frequency: 'Minimum 1-hourly',
    action: 'Urgent review by ward clinician or acute team nurse; consider escalation to critical care outreach.',
  },
  high: {
    label: 'High',
    frequency: 'Continuous monitoring',
    action: 'EMERGENCY: immediate assessment by critical care team. Consider transfer to higher level of care.',
  },
};

export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9 * 10) / 10;
}

export function scoreRespiratoryRate(rr: number): number {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

export function scoreSpo2(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

export function scoreSystolic(sbp: number): number {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

export function scoreHeartRate(hr: number): number {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}

export function scoreTemperatureCelsius(c: number): number {
  if (c <= 35.0) return 3;
  if (c <= 36.0) return 1;
  if (c <= 38.0) return 0;
  if (c <= 39.0) return 1;
  return 2;
}

export function scoreConsciousness(level: ConsciousnessLevel): number {
  return level === 'A' ? 0 : 3;
}

export function classifyNews2(total: number, hasRedScore: boolean): News2Risk {
  if (total >= 7) return 'high';
  if (total >= 5) return 'medium';
  if (hasRedScore) return 'low-medium';
  if (total >= 1) return 'low';
  return 'none';
}

export function calculateNews2(reading: Partial<VitalReading>): News2Result {
  const components: News2Component[] = [];
  const missing: News2Parameter[] = [];

  const numeric = (
    parameter: News2Parameter,
    label: string,
    value: number | undefined,
    scorer: (v: number) => number,
    format: (v: number) => string,
  ) => {
    if (value === undefined || Number.isNaN(value)) {
      missing.push(parameter);
      return;
    }
    components.push({ parameter, label, display: format(value), points: scorer(value), assumed: false });
  };

  numeric('respiratoryRate', 'Resp Rate', reading.respiratoryRate, scoreRespiratoryRate, v => `${v}/min`);
  numeric('spo2', 'SpO2', reading.spo2, scoreSpo2, v => `${v}%`);

  const onO2 = reading.supplementalO2 ?? false;
  components.push({
    parameter: 'supplementalO2',
    label: 'Air or O2',
    display: onO2 ? 'Oxygen' : 'Room air',
    points: onO2 ? 2 : 0,
    assumed: reading.supplementalO2 === undefined,
  });

  numeric('systolic', 'Systolic BP', reading.systolic, scoreSystolic, v => `${v} mmHg`);
  numeric('heartRate', 'Pulse', reading.heartRate, scoreHeartRate, v => `${v} bpm`);

  const level = reading.consciousness ?? 'A';
  components.push({
    parameter: 'consciousness',
    label: 'Consciousness',
    display: CONSCIOUSNESS_LABELS[level],
    points: scoreConsciousness(level),
    assumed: reading.consciousness === undefined,
  });

  numeric(
    'temperature',
    'Temperature',
    reading.temperature === undefined ? undefined : fahrenheitToCelsius(reading.temperature),
    scoreTemperatureCelsius,
    v => `${v.toFixed(1)} °C`,
  );

  const total = components.reduce((sum, c) => sum + c.points, 0);
  const hasRedScore = components.some(c => c.points === 3);

  return { total, risk: classifyNews2(total, hasRedScore), components, missing, hasRedScore };
}

export const NEWS2_RISK_STYLE: Record<News2Risk, { background: string; color: string; border: string }> = {
  none: { background: '#d4edda', color: '#155724', border: '#28a745' },
  low: { background: '#d4edda', color: '#155724', border: '#28a745' },
  'low-medium': { background: '#fff3cd', color: '#664d00', border: '#cc9900' },
  medium: { background: '#ffe0b3', color: '#7a3e00', border: '#e67e00' },
  high: { background: '#ffcccc', color: '#990000', border: '#cc0000' },
};

export const NEWS2_POINT_STYLE: Record<number, { background: string; color: string }> = {
  0: { background: '#ffffff', color: '#333333' },
  1: { background: '#fff3cd', color: '#664d00' },
  2: { background: '#ffe0b3', color: '#7a3e00' },
  3: { background: '#ffcccc', color: '#990000' },
};
