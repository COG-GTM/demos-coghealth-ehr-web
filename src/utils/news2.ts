import type { Consciousness, VitalReading } from '../types';

export type News2Parameter =
  | 'respiratoryRate'
  | 'spo2'
  | 'onOxygen'
  | 'systolic'
  | 'heartRate'
  | 'consciousness'
  | 'temperature';

export type News2RiskLevel = 'INCOMPLETE' | 'NONE' | 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH';

export interface News2Component {
  parameter: News2Parameter;
  label: string;
  value: string;
  points: number;
}

export interface News2Result {
  total: number;
  components: News2Component[];
  missing: News2Parameter[];
  complete: boolean;
  hasRedScore: boolean;
  risk: News2RiskLevel;
  response: string;
  frequency: string;
}

export const fahrenheitToCelsius = (f: number) => ((f - 32) * 5) / 9;

const band = (value: number, bands: [number, number][], fallback: number) => {
  for (const [upper, points] of bands) {
    if (value <= upper) return points;
  }
  return fallback;
};

export const scoreRespiratoryRate = (rr: number) =>
  band(rr, [[8, 3], [11, 1], [20, 0], [24, 2]], 3);

export const scoreSpo2 = (spo2: number) =>
  band(spo2, [[91, 3], [93, 2], [95, 1]], 0);

export const scoreSystolic = (sbp: number) =>
  band(sbp, [[90, 3], [100, 2], [110, 1], [219, 0]], 3);

export const scoreHeartRate = (hr: number) =>
  band(hr, [[40, 3], [50, 1], [90, 0], [110, 1], [130, 2]], 3);

export const scoreTemperatureC = (tempC: number) => {
  const t = Math.round(tempC * 10) / 10;
  return band(t, [[35.0, 3], [36.0, 1], [38.0, 0], [39.0, 1]], 2);
};

export const scoreConsciousness = (c: Consciousness) => (c === 'A' ? 0 : 3);

const consciousnessLabels: Record<Consciousness, string> = {
  A: 'Alert',
  C: 'New confusion',
  V: 'Voice',
  P: 'Pain',
  U: 'Unresponsive',
};

const riskDetails: Record<News2RiskLevel, { response: string; frequency: string }> = {
  INCOMPLETE: { response: 'Score not valid: record all NEWS2 parameters', frequency: 'Complete the observation set' },
  NONE: { response: 'Continue routine NEWS monitoring', frequency: 'Minimum 12-hourly' },
  LOW: { response: 'Inform registered nurse to assess patient', frequency: 'Minimum 4–6 hourly' },
  LOW_MEDIUM: { response: 'Urgent ward-based review by clinician', frequency: 'Minimum 1-hourly' },
  MEDIUM: { response: 'Urgent review by clinician competent in acute illness', frequency: 'Minimum 1-hourly' },
  HIGH: { response: 'EMERGENCY: notify rapid response team immediately', frequency: 'Continuous monitoring' },
};

export const news2ParameterLabels: Record<News2Parameter, string> = {
  respiratoryRate: 'Resp Rate',
  spo2: 'SpO2',
  onOxygen: 'Air/Oxygen',
  systolic: 'BP Systolic',
  heartRate: 'Pulse',
  consciousness: 'AVPU',
  temperature: 'Temperature',
};

export const news2RiskLabels: Record<News2RiskLevel, string> = {
  INCOMPLETE: 'Incomplete',
  NONE: 'Low',
  LOW: 'Low',
  LOW_MEDIUM: 'Low-Medium',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export function getNews2Risk(total: number, hasRedScore: boolean): News2RiskLevel {
  if (total >= 7) return 'HIGH';
  if (total >= 5) return 'MEDIUM';
  if (hasRedScore) return 'LOW_MEDIUM';
  if (total >= 1) return 'LOW';
  return 'NONE';
}

export function calculateNews2(reading: VitalReading): News2Result {
  const components: News2Component[] = [];
  const missing: News2Parameter[] = [];

  const add = (parameter: News2Parameter, label: string, raw: number | undefined, format: (v: number) => string, score: (v: number) => number) => {
    if (raw === undefined || Number.isNaN(raw)) {
      missing.push(parameter);
      return;
    }
    components.push({ parameter, label, value: format(raw), points: score(raw) });
  };

  add('respiratoryRate', 'Resp Rate', reading.respiratoryRate, v => `${v} /min`, scoreRespiratoryRate);
  add('spo2', 'SpO2 (Scale 1)', reading.spo2, v => `${v} %`, scoreSpo2);
  if (reading.onOxygen === undefined) {
    missing.push('onOxygen');
  } else {
    components.push({
      parameter: 'onOxygen',
      label: 'Air or Oxygen',
      value: reading.onOxygen ? 'Supplemental O2' : 'Room air',
      points: reading.onOxygen ? 2 : 0,
    });
  }
  add('systolic', 'BP Systolic', reading.systolic, v => `${v} mmHg`, scoreSystolic);
  add('heartRate', 'Pulse', reading.heartRate, v => `${v} bpm`, scoreHeartRate);
  if (reading.consciousness === undefined) {
    missing.push('consciousness');
  } else {
    components.push({
      parameter: 'consciousness',
      label: 'Consciousness',
      value: consciousnessLabels[reading.consciousness],
      points: scoreConsciousness(reading.consciousness),
    });
  }
  add('temperature', 'Temperature', reading.temperature, v => `${fahrenheitToCelsius(v).toFixed(1)} °C`, v => scoreTemperatureC(fahrenheitToCelsius(v)));

  const total = components.reduce((sum, c) => sum + c.points, 0);
  const hasRedScore = components.some(c => c.points === 3);
  const complete = missing.length === 0;
  const risk = complete ? getNews2Risk(total, hasRedScore) : 'INCOMPLETE';

  return { total, components, missing, complete, hasRedScore, risk, ...riskDetails[risk] };
}

export const news2RiskStyles: Record<News2RiskLevel, { background: string; color: string; border: string }> = {
  INCOMPLETE: { background: '#eeeeee', color: '#555555', border: '#999999' },
  NONE: { background: '#e6f4e6', color: '#1f5f1f', border: '#7fbf7f' },
  LOW: { background: '#e6f4e6', color: '#1f5f1f', border: '#7fbf7f' },
  LOW_MEDIUM: { background: '#fff3cd', color: '#664d00', border: '#e0b84d' },
  MEDIUM: { background: '#ffe0b3', color: '#8a4b00', border: '#e08a1f' },
  HIGH: { background: '#ffcccc', color: '#990000', border: '#cc3333' },
};
