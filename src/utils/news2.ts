import type { Consciousness, VitalReading } from '../types';

export type News2Risk = 'INCOMPLETE' | 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH';

export type News2ParameterKey =
  | 'respiratoryRate'
  | 'spo2'
  | 'supplementalO2'
  | 'systolic'
  | 'heartRate'
  | 'consciousness'
  | 'temperature';

export interface News2Component {
  key: News2ParameterKey;
  label: string;
  display: string;
  points: number;
}

export interface News2Result {
  total: number;
  risk: News2Risk;
  components: News2Component[];
  missing: News2ParameterKey[];
  complete: boolean;
  hasRedScore: boolean;
}

export interface News2Response {
  label: string;
  monitoring: string;
  action: string;
}

export const news2ParameterLabels: Record<News2ParameterKey, string> = {
  respiratoryRate: 'Respiration Rate',
  spo2: 'SpO2 (Scale 1)',
  supplementalO2: 'Air or Oxygen',
  systolic: 'Systolic BP',
  heartRate: 'Pulse',
  consciousness: 'Consciousness',
  temperature: 'Temperature',
};

const REQUIRED_KEYS: News2ParameterKey[] = ['respiratoryRate', 'spo2', 'systolic', 'heartRate', 'temperature'];

export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5 / 9) * 10) / 10;
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

export function scoreSupplementalO2(onO2: boolean): number {
  return onO2 ? 2 : 0;
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

export function scoreConsciousness(level: Consciousness): number {
  return level === 'A' ? 0 : 3;
}

export function scoreTemperatureC(tempC: number): number {
  if (tempC <= 35.0) return 3;
  if (tempC <= 36.0) return 1;
  if (tempC <= 38.0) return 0;
  if (tempC <= 39.0) return 1;
  return 2;
}

export const consciousnessLabels: Record<Consciousness, string> = {
  A: 'Alert',
  C: 'New Confusion',
  V: 'Responds to Voice',
  P: 'Responds to Pain',
  U: 'Unresponsive',
};

export function calculateNews2(reading: Partial<VitalReading>): News2Result {
  const components: News2Component[] = [];
  const missing: News2ParameterKey[] = [];

  const add = (key: News2ParameterKey, value: number | undefined, display: (v: number) => string, score: (v: number) => number) => {
    if (value === undefined || Number.isNaN(value)) {
      missing.push(key);
      return;
    }
    components.push({ key, label: news2ParameterLabels[key], display: display(value), points: score(value) });
  };

  add('respiratoryRate', reading.respiratoryRate, v => `${v} /min`, scoreRespiratoryRate);
  add('spo2', reading.spo2, v => `${v} %`, scoreSpo2);

  const onO2 = reading.onSupplementalO2 ?? false;
  components.push({ key: 'supplementalO2', label: news2ParameterLabels.supplementalO2, display: onO2 ? 'Oxygen' : 'Room Air', points: scoreSupplementalO2(onO2) });

  add('systolic', reading.systolic, v => `${v} mmHg`, scoreSystolic);
  add('heartRate', reading.heartRate, v => `${v} bpm`, scoreHeartRate);

  const avpu = reading.consciousness ?? 'A';
  components.push({ key: 'consciousness', label: news2ParameterLabels.consciousness, display: consciousnessLabels[avpu], points: scoreConsciousness(avpu) });

  add('temperature', reading.temperature, v => `${fahrenheitToCelsius(v).toFixed(1)} °C (${v.toFixed(1)} °F)`, v => scoreTemperatureC(fahrenheitToCelsius(v)));

  const total = components.reduce((sum, c) => sum + c.points, 0);
  const hasRedScore = components.some(c => c.points === 3);

  let risk: News2Risk = 'LOW';
  if (total >= 7) risk = 'HIGH';
  else if (total >= 5) risk = 'MEDIUM';
  else if (hasRedScore) risk = 'LOW_MEDIUM';

  // A partial score can only rise once missing parameters are added, so an
  // elevated partial score is still actionable, but a low one is not reassuring.
  const complete = REQUIRED_KEYS.every(k => !missing.includes(k));
  if (!complete && risk === 'LOW') risk = 'INCOMPLETE';

  return {
    total,
    risk,
    components,
    missing,
    complete,
    hasRedScore,
  };
}

export function isNews2Actionable(risk: News2Risk): boolean {
  return risk === 'LOW_MEDIUM' || risk === 'MEDIUM' || risk === 'HIGH';
}

export function getNews2Response(result: News2Result): News2Response {
  switch (result.risk) {
    case 'HIGH':
      return {
        label: 'HIGH RISK',
        monitoring: 'Continuous monitoring of vital signs',
        action: 'Emergency response: immediate assessment by critical care / rapid response team',
      };
    case 'MEDIUM':
      return {
        label: 'MEDIUM RISK',
        monitoring: 'Minimum 1-hourly observations',
        action: 'Urgent response: notify provider for urgent bedside review',
      };
    case 'LOW_MEDIUM':
      return {
        label: 'LOW-MEDIUM RISK',
        monitoring: 'Minimum 1-hourly observations',
        action: 'Single parameter scored 3: urgent ward-based review by provider',
      };
    case 'INCOMPLETE':
      return {
        label: 'INCOMPLETE',
        monitoring: `Record missing parameters: ${result.missing.map(k => news2ParameterLabels[k]).join(', ')}`,
        action: 'Risk cannot be determined from a partial score',
      };
    default:
      return result.total === 0
        ? { label: 'LOW RISK', monitoring: 'Minimum 12-hourly observations', action: 'Continue routine monitoring' }
        : { label: 'LOW RISK', monitoring: 'Minimum 4-6 hourly observations', action: 'Registered nurse to assess and decide on frequency of monitoring' };
  }
}

export const news2RiskStyles: Record<News2Risk, { background: string; color: string; border: string }> = {
  INCOMPLETE: { background: '#e8e8e8', color: '#444444', border: '#888888' },
  LOW: { background: '#d4edda', color: '#155724', border: '#28a745' },
  LOW_MEDIUM: { background: '#fff3cd', color: '#664d00', border: '#cc9900' },
  MEDIUM: { background: '#ffe0b2', color: '#8a3b00', border: '#e67e22' },
  HIGH: { background: '#ffcccc', color: '#990000', border: '#cc0000' },
};
