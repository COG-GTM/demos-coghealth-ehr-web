import type { Consciousness, VitalReading } from '../types/vitals';

export type News2Parameter =
  | 'respiratoryRate'
  | 'spo2'
  | 'supplementalO2'
  | 'systolic'
  | 'heartRate'
  | 'consciousness'
  | 'temperature';

export type News2Risk = 'low' | 'low-medium' | 'medium' | 'high';

export interface News2Component {
  parameter: News2Parameter;
  label: string;
  value: string;
  points: number;
}

export interface News2Result {
  total: number;
  risk: News2Risk;
  components: News2Component[];
  hasRedScore: boolean;
  complete: boolean;
  missing: News2Parameter[];
}

export interface News2Response {
  label: string;
  monitoring: string;
  action: string;
}

export const NEWS2_LABELS: Record<News2Parameter, string> = {
  respiratoryRate: 'Resp Rate',
  spo2: 'SpO2 (Scale 1)',
  supplementalO2: 'Air or Oxygen',
  systolic: 'Systolic BP',
  heartRate: 'Pulse',
  consciousness: 'Consciousness',
  temperature: 'Temperature',
};

export const fahrenheitToCelsius = (f: number) => ((f - 32) * 5) / 9;

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

export function scoreSupplementalO2(onOxygen: boolean): number {
  return onOxygen ? 2 : 0;
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

export function scoreTemperatureCelsius(tempC: number): number {
  const t = Math.round(tempC * 10) / 10;
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}

export function classifyRisk(total: number, hasRedScore: boolean): News2Risk {
  if (total >= 7) return 'high';
  if (total >= 5) return 'medium';
  if (hasRedScore) return 'low-medium';
  return 'low';
}

export function calculateNews2(reading: Partial<VitalReading>): News2Result {
  const components: News2Component[] = [];
  const missing: News2Parameter[] = [];
  const add = (parameter: News2Parameter, value: string, points: number) =>
    components.push({ parameter, label: NEWS2_LABELS[parameter], value, points });

  if (reading.respiratoryRate !== undefined) {
    add('respiratoryRate', `${reading.respiratoryRate}/min`, scoreRespiratoryRate(reading.respiratoryRate));
  } else missing.push('respiratoryRate');

  if (reading.spo2 !== undefined) {
    add('spo2', `${reading.spo2}%`, scoreSpo2(reading.spo2));
  } else missing.push('spo2');

  if (reading.supplementalO2 !== undefined) {
    add('supplementalO2', reading.supplementalO2 ? 'Oxygen' : 'Air', scoreSupplementalO2(reading.supplementalO2));
  } else missing.push('supplementalO2');

  if (reading.systolic !== undefined) {
    add('systolic', `${reading.systolic} mmHg`, scoreSystolic(reading.systolic));
  } else missing.push('systolic');

  if (reading.heartRate !== undefined) {
    add('heartRate', `${reading.heartRate} bpm`, scoreHeartRate(reading.heartRate));
  } else missing.push('heartRate');

  if (reading.consciousness !== undefined) {
    add('consciousness', CONSCIOUSNESS_LABELS[reading.consciousness], scoreConsciousness(reading.consciousness));
  } else missing.push('consciousness');

  if (reading.temperature !== undefined) {
    const tempC = fahrenheitToCelsius(reading.temperature);
    add('temperature', `${reading.temperature.toFixed(1)}°F (${tempC.toFixed(1)}°C)`, scoreTemperatureCelsius(tempC));
  } else missing.push('temperature');

  const total = components.reduce((sum, c) => sum + c.points, 0);
  const hasRedScore = components.some(c => c.points === 3);

  return {
    total,
    risk: classifyRisk(total, hasRedScore),
    components,
    hasRedScore,
    complete: missing.length === 0,
    missing,
  };
}

export const CONSCIOUSNESS_LABELS: Record<Consciousness, string> = {
  A: 'Alert',
  C: 'New Confusion',
  V: 'Responds to Voice',
  P: 'Responds to Pain',
  U: 'Unresponsive',
};

export const NEWS2_RESPONSES: Record<News2Risk, News2Response> = {
  low: {
    label: 'Low',
    monitoring: 'Minimum every 12 hrs (every 4-6 hrs if score 1-4)',
    action: 'Continue routine monitoring. Registered nurse to assess and decide whether to increase monitoring frequency.',
  },
  'low-medium': {
    label: 'Low-Medium',
    monitoring: 'Minimum every 1 hr',
    action: 'Single parameter scored 3. Urgent ward-based review by a clinician to decide on change to monitoring or escalation.',
  },
  medium: {
    label: 'Medium',
    monitoring: 'Minimum every 1 hr',
    action: 'Urgent response threshold. Inform medical team immediately; urgent assessment by a clinician with acute illness competencies. Consider sepsis screen.',
  },
  high: {
    label: 'High',
    monitoring: 'Continuous monitoring of vital signs',
    action: 'Emergency response threshold. Immediate assessment by critical care outreach / rapid response team. Consider transfer to higher level of care.',
  },
};

export const NEWS2_COLORS: Record<News2Risk, { bg: string; border: string; text: string }> = {
  low: { bg: '#e6f4ea', border: '#4caf50', text: '#1b5e20' },
  'low-medium': { bg: '#fff8e1', border: '#f9a825', text: '#7a5500' },
  medium: { bg: '#ffe0b2', border: '#ef6c00', text: '#8a3c00' },
  high: { bg: '#ffcdd2', border: '#c62828', text: '#8b0000' },
};

export const NEWS2_INDETERMINATE_COLORS = { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' };

// A partial total is a lower bound: unrecorded parameters can only add points.
export function news2Colors(result: News2Result) {
  return result.complete || result.risk !== 'low' ? NEWS2_COLORS[result.risk] : NEWS2_INDETERMINATE_COLORS;
}

export function news2RiskLabel(result: News2Result): string {
  const label = NEWS2_RESPONSES[result.risk].label;
  if (result.complete) return `${label} risk`;
  return result.risk === 'low' ? 'Risk indeterminate' : `At least ${label} risk`;
}

export function describeMissing(result: News2Result): string {
  return result.missing.map(p => NEWS2_LABELS[p]).join(', ');
}
