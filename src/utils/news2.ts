/**
 * NEWS2 (National Early Warning Score 2, Royal College of Physicians 2017)
 * aggregate scoring for physiological deterioration detection.
 */

export type ConsciousnessLevel = 'A' | 'CVPU';
export type OxygenDelivery = 'air' | 'oxygen';

export interface News2Observations {
  respiratoryRate?: number;
  spo2?: number;
  systolic?: number;
  heartRate?: number;
  /** Temperature in degrees Fahrenheit (matches EHR flowsheet units). */
  temperature?: number;
  consciousness?: ConsciousnessLevel;
  oxygenDelivery?: OxygenDelivery;
}

export type News2ParameterKey =
  | 'respiratoryRate'
  | 'spo2'
  | 'oxygenDelivery'
  | 'systolic'
  | 'heartRate'
  | 'consciousness'
  | 'temperature';

export interface News2Parameter {
  key: News2ParameterKey;
  label: string;
  /** Display value, already unit-formatted. Null when the observation is missing. */
  display: string | null;
  score: number;
  scored: boolean;
}

export type News2RiskBand = 'low' | 'low-medium' | 'medium' | 'high';

export interface News2Result {
  total: number;
  parameters: News2Parameter[];
  /** True when any single parameter scores the maximum of 3. */
  hasRedScore: boolean;
  riskBand: News2RiskBand;
  riskLabel: string;
  monitoringFrequency: string;
  clinicalResponse: string;
  /** Count of the seven parameters that had an observation available. */
  scoredParameterCount: number;
  complete: boolean;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

function scoreRespiratoryRate(rr: number): number {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function scoreSpo2(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreSystolic(sbp: number): number {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

function scoreHeartRate(hr: number): number {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}

function scoreTemperatureCelsius(c: number): number {
  if (c <= 35.0) return 3;
  if (c < 36.1) return 1;
  if (c <= 38.0) return 0;
  if (c <= 39.0) return 1;
  return 2;
}

const RISK_BANDS: Record<News2RiskBand, Omit<News2Result, 'total' | 'parameters' | 'hasRedScore' | 'riskBand' | 'scoredParameterCount' | 'complete'>> = {
  low: {
    riskLabel: 'LOW',
    monitoringFrequency: 'Minimum 4-6 hourly',
    clinicalResponse: 'Ward-based response — assessment by registered nurse.',
  },
  'low-medium': {
    riskLabel: 'LOW-MEDIUM',
    monitoringFrequency: 'Minimum hourly',
    clinicalResponse: 'Urgent review by ward-based doctor (single red score).',
  },
  medium: {
    riskLabel: 'MEDIUM',
    monitoringFrequency: 'Minimum hourly',
    clinicalResponse: 'Urgent review by acute team with critical care skills.',
  },
  high: {
    riskLabel: 'HIGH',
    monitoringFrequency: 'Continuous monitoring',
    clinicalResponse: 'Emergency assessment by critical care team — consider transfer to higher level of care.',
  },
};

function resolveRiskBand(total: number, hasRedScore: boolean): News2RiskBand {
  if (total >= 7) return 'high';
  if (total >= 5) return 'medium';
  if (hasRedScore) return 'low-medium';
  return 'low';
}

/**
 * Scores a set of observations. Missing observations are reported as unscored
 * rather than assumed normal, so partial flowsheet rows never inflate the total.
 */
export function calculateNews2(obs: News2Observations): News2Result {
  const parameters: News2Parameter[] = [
    {
      key: 'respiratoryRate',
      label: 'Respiration rate',
      display: obs.respiratoryRate !== undefined ? `${obs.respiratoryRate} /min` : null,
      score: obs.respiratoryRate !== undefined ? scoreRespiratoryRate(obs.respiratoryRate) : 0,
      scored: obs.respiratoryRate !== undefined,
    },
    {
      key: 'spo2',
      label: 'SpO2',
      display: obs.spo2 !== undefined ? `${obs.spo2} %` : null,
      score: obs.spo2 !== undefined ? scoreSpo2(obs.spo2) : 0,
      scored: obs.spo2 !== undefined,
    },
    {
      key: 'oxygenDelivery',
      label: 'Air or oxygen',
      display: obs.oxygenDelivery === 'oxygen' ? 'Supplemental O2' : 'Air',
      score: obs.oxygenDelivery === 'oxygen' ? 2 : 0,
      scored: true,
    },
    {
      key: 'systolic',
      label: 'Systolic BP',
      display: obs.systolic !== undefined ? `${obs.systolic} mmHg` : null,
      score: obs.systolic !== undefined ? scoreSystolic(obs.systolic) : 0,
      scored: obs.systolic !== undefined,
    },
    {
      key: 'heartRate',
      label: 'Pulse',
      display: obs.heartRate !== undefined ? `${obs.heartRate} bpm` : null,
      score: obs.heartRate !== undefined ? scoreHeartRate(obs.heartRate) : 0,
      scored: obs.heartRate !== undefined,
    },
    {
      key: 'consciousness',
      label: 'Consciousness',
      display: obs.consciousness === 'CVPU' ? 'CVPU' : 'Alert',
      score: obs.consciousness === 'CVPU' ? 3 : 0,
      scored: true,
    },
    {
      key: 'temperature',
      label: 'Temperature',
      display:
        obs.temperature !== undefined
          ? `${obs.temperature.toFixed(1)} °F (${fahrenheitToCelsius(obs.temperature).toFixed(1)} °C)`
          : null,
      score: obs.temperature !== undefined ? scoreTemperatureCelsius(fahrenheitToCelsius(obs.temperature)) : 0,
      scored: obs.temperature !== undefined,
    },
  ];

  const total = parameters.reduce((sum, p) => sum + p.score, 0);
  const hasRedScore = parameters.some(p => p.score === 3);
  const riskBand = resolveRiskBand(total, hasRedScore);
  const scoredParameterCount = parameters.filter(p => p.scored).length;

  return {
    total,
    parameters,
    hasRedScore,
    riskBand,
    scoredParameterCount,
    complete: scoredParameterCount === parameters.length,
    ...RISK_BANDS[riskBand],
  };
}

export interface News2Trend {
  direction: 'rising' | 'falling' | 'stable';
  delta: number;
}

/** Compares a score against the preceding observation set. */
export function news2Trend(current: number, previous: number | undefined): News2Trend | null {
  if (previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return { direction: 'stable', delta };
  return { direction: delta > 0 ? 'rising' : 'falling', delta };
}
