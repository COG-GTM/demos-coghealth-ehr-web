import type { VitalReading } from '../types';

export type Consciousness = 'A' | 'CVPU';

export type RiskBand = 'low' | 'low-medium' | 'medium' | 'high';

export interface News2Parameter {
  key: string;
  label: string;
  display: string;
  score: number;
  missing: boolean;
}

export interface News2Result {
  total: number;
  band: RiskBand;
  bandLabel: string;
  guidance: string;
  monitoringFrequency: string;
  parameters: News2Parameter[];
  redFlagParameters: string[];
  missingParameters: string[];
}

export interface News2Options {
  consciousness?: Consciousness;
  onSupplementalOxygen?: boolean;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
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

export function scoreSystolic(systolic: number): number {
  if (systolic <= 90) return 3;
  if (systolic <= 100) return 2;
  if (systolic <= 110) return 1;
  if (systolic <= 219) return 0;
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

export function scoreTemperatureCelsius(celsius: number): number {
  if (celsius <= 35.0) return 3;
  if (celsius < 36.05) return 1;
  if (celsius < 38.05) return 0;
  if (celsius < 39.05) return 1;
  return 2;
}

const BAND_LABEL: Record<RiskBand, string> = {
  low: 'LOW',
  'low-medium': 'LOW-MEDIUM',
  medium: 'MEDIUM',
  high: 'HIGH',
};

const BAND_GUIDANCE: Record<RiskBand, string> = {
  low: 'Continue routine ward monitoring. Escalate per local policy if the score rises.',
  'low-medium':
    'Single parameter scoring 3 - urgent review by a ward-based doctor to decide on escalation of care.',
  medium:
    'Urgent review by a clinician competent in acute illness. Consider transfer to a higher level of care.',
  high:
    'Emergency assessment by a critical care team. Continuous monitoring of vital signs required.',
};

const BAND_FREQUENCY: Record<RiskBand, string> = {
  low: 'Minimum 12-hourly (4-6 hourly if score 1-4)',
  'low-medium': 'Minimum hourly',
  medium: 'Minimum hourly',
  high: 'Continuous',
};

export function bandForScore(total: number, hasRedFlag: boolean): RiskBand {
  if (total >= 7) return 'high';
  if (total >= 5) return 'medium';
  if (hasRedFlag) return 'low-medium';
  return 'low';
}

export function calculateNews2(
  reading: Pick<VitalReading, 'respiratoryRate' | 'spo2' | 'systolic' | 'heartRate' | 'temperature'>,
  options: News2Options = {}
): News2Result {
  const { consciousness = 'A', onSupplementalOxygen = false } = options;
  const parameters: News2Parameter[] = [];

  const add = (
    key: string,
    label: string,
    value: number | undefined,
    format: (v: number) => string,
    scorer: (v: number) => number
  ) => {
    if (value === undefined) {
      parameters.push({ key, label, display: '--', score: 0, missing: true });
      return;
    }
    parameters.push({ key, label, display: format(value), score: scorer(value), missing: false });
  };

  add('respiratoryRate', 'Respiration rate', reading.respiratoryRate, v => `${v} /min`, scoreRespiratoryRate);
  add('spo2', 'SpO2 (scale 1)', reading.spo2, v => `${v} %`, scoreSpo2);
  parameters.push({
    key: 'supplementalOxygen',
    label: 'Air or oxygen',
    display: onSupplementalOxygen ? 'Oxygen' : 'Air',
    score: onSupplementalOxygen ? 2 : 0,
    missing: false,
  });
  add('systolic', 'Systolic BP', reading.systolic, v => `${v} mmHg`, scoreSystolic);
  add('heartRate', 'Pulse', reading.heartRate, v => `${v} bpm`, scoreHeartRate);
  parameters.push({
    key: 'consciousness',
    label: 'Consciousness',
    display: consciousness === 'A' ? 'Alert' : 'CVPU',
    score: consciousness === 'A' ? 0 : 3,
    missing: false,
  });
  add(
    'temperature',
    'Temperature',
    reading.temperature,
    v => `${fahrenheitToCelsius(v).toFixed(1)} \u00b0C`,
    v => scoreTemperatureCelsius(fahrenheitToCelsius(v))
  );

  const total = parameters.reduce((sum, p) => sum + p.score, 0);
  const redFlagParameters = parameters.filter(p => p.score === 3).map(p => p.label);
  const band = bandForScore(total, redFlagParameters.length > 0);

  return {
    total,
    band,
    bandLabel: BAND_LABEL[band],
    guidance: BAND_GUIDANCE[band],
    monitoringFrequency: BAND_FREQUENCY[band],
    parameters,
    redFlagParameters,
    missingParameters: parameters.filter(p => p.missing).map(p => p.label),
  };
}

export type ScoreTrend = 'rising' | 'falling' | 'stable';

export interface News2Trend {
  trend: ScoreTrend;
  delta: number;
}

export function news2Trend(scores: number[]): News2Trend {
  if (scores.length < 2) return { trend: 'stable', delta: 0 };
  const delta = scores[0] - scores[1];
  if (delta > 0) return { trend: 'rising', delta };
  if (delta < 0) return { trend: 'falling', delta };
  return { trend: 'stable', delta: 0 };
}
