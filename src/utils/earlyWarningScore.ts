import type { VitalReading } from '../types';

export type Consciousness = 'alert' | 'cvpu';

export type RiskLevel = 'low' | 'low-medium' | 'medium' | 'high';

export interface ScoreComponent {
  key: 'respiratoryRate' | 'spo2' | 'oxygen' | 'temperature' | 'systolic' | 'heartRate' | 'consciousness';
  label: string;
  display: string;
  score: number;
}

export interface EarlyWarningScore {
  total: number;
  components: ScoreComponent[];
  maxComponentScore: number;
  missingParameters: string[];
  risk: RiskLevel;
  riskLabel: string;
  monitoringFrequency: string;
  escalation: string;
}

export interface SepsisScreen {
  sirsCriteriaMet: string[];
  qsofaScore: number;
  qsofaCriteriaMet: string[];
  positive: boolean;
  recommendation: string;
}

export interface DeteriorationTrend {
  current: number;
  previous: number | null;
  delta: number | null;
  direction: 'improving' | 'worsening' | 'stable' | 'unknown';
}

export const fahrenheitToCelsius = (f: number): number => ((f - 32) * 5) / 9;

const scoreRespiratoryRate = (rr: number): number => {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
};

const scoreSpo2 = (spo2: number): number => {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
};

const scoreTemperatureCelsius = (c: number): number => {
  if (c <= 35.0) return 3;
  if (c <= 36.0) return 1;
  if (c <= 38.0) return 0;
  if (c <= 39.0) return 1;
  return 2;
};

const scoreSystolic = (sbp: number): number => {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
};

const scoreHeartRate = (hr: number): number => {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
};

const riskFor = (total: number, maxComponentScore: number): Pick<EarlyWarningScore, 'risk' | 'riskLabel' | 'monitoringFrequency' | 'escalation'> => {
  if (total >= 7) {
    return {
      risk: 'high',
      riskLabel: 'HIGH — Emergency response',
      monitoringFrequency: 'Continuous monitoring',
      escalation: 'Immediate assessment by critical care / rapid response team. Consider transfer to a higher level of care.',
    };
  }
  if (total >= 5) {
    return {
      risk: 'medium',
      riskLabel: 'MEDIUM — Urgent review',
      monitoringFrequency: 'At least hourly',
      escalation: 'Urgent review by the ward doctor within 1 hour; escalate to the rapid response team if no improvement.',
    };
  }
  if (maxComponentScore >= 3) {
    return {
      risk: 'low-medium',
      riskLabel: 'LOW-MEDIUM — Single red score',
      monitoringFrequency: 'At least hourly',
      escalation: 'Urgent review by the ward doctor for a single parameter scoring 3.',
    };
  }
  if (total >= 1) {
    return {
      risk: 'low',
      riskLabel: 'LOW — Ward-based response',
      monitoringFrequency: 'Every 4-6 hours',
      escalation: 'Assessment by a registered nurse, who decides whether escalation is required.',
    };
  }
  return {
    risk: 'low',
    riskLabel: 'LOW — Routine monitoring',
    monitoringFrequency: 'Every 12 hours',
    escalation: 'Continue routine observations.',
  };
};

export function calculateNews2(
  reading: VitalReading,
  options: { supplementalOxygen?: boolean; consciousness?: Consciousness } = {}
): EarlyWarningScore {
  const { supplementalOxygen = false, consciousness = 'alert' } = options;
  const components: ScoreComponent[] = [];
  const missingParameters: string[] = [];

  if (reading.respiratoryRate !== undefined) {
    components.push({
      key: 'respiratoryRate',
      label: 'Respiration rate',
      display: `${reading.respiratoryRate} /min`,
      score: scoreRespiratoryRate(reading.respiratoryRate),
    });
  } else {
    missingParameters.push('Respiration rate');
  }

  if (reading.spo2 !== undefined) {
    components.push({
      key: 'spo2',
      label: 'SpO2',
      display: `${reading.spo2} %`,
      score: scoreSpo2(reading.spo2),
    });
  } else {
    missingParameters.push('SpO2');
  }

  components.push({
    key: 'oxygen',
    label: 'Air or oxygen',
    display: supplementalOxygen ? 'Supplemental O2' : 'Room air',
    score: supplementalOxygen ? 2 : 0,
  });

  if (reading.temperature !== undefined) {
    const celsius = fahrenheitToCelsius(reading.temperature);
    components.push({
      key: 'temperature',
      label: 'Temperature',
      display: `${reading.temperature.toFixed(1)} °F (${celsius.toFixed(1)} °C)`,
      score: scoreTemperatureCelsius(celsius),
    });
  } else {
    missingParameters.push('Temperature');
  }

  if (reading.systolic !== undefined) {
    components.push({
      key: 'systolic',
      label: 'Systolic BP',
      display: `${reading.systolic} mmHg`,
      score: scoreSystolic(reading.systolic),
    });
  } else {
    missingParameters.push('Systolic BP');
  }

  if (reading.heartRate !== undefined) {
    components.push({
      key: 'heartRate',
      label: 'Pulse',
      display: `${reading.heartRate} bpm`,
      score: scoreHeartRate(reading.heartRate),
    });
  } else {
    missingParameters.push('Pulse');
  }

  components.push({
    key: 'consciousness',
    label: 'Consciousness',
    display: consciousness === 'alert' ? 'Alert' : 'Confusion / V, P or U',
    score: consciousness === 'alert' ? 0 : 3,
  });

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const maxComponentScore = components.reduce((max, c) => Math.max(max, c.score), 0);

  return {
    total,
    components,
    maxComponentScore,
    missingParameters,
    ...riskFor(total, maxComponentScore),
  };
}

export function screenForSepsis(
  reading: VitalReading,
  options: { consciousness?: Consciousness } = {}
): SepsisScreen {
  const { consciousness = 'alert' } = options;
  const sirsCriteriaMet: string[] = [];
  const qsofaCriteriaMet: string[] = [];

  if (reading.temperature !== undefined) {
    const celsius = fahrenheitToCelsius(reading.temperature);
    if (celsius > 38) sirsCriteriaMet.push(`Temp ${celsius.toFixed(1)} °C > 38 °C`);
    else if (celsius < 36) sirsCriteriaMet.push(`Temp ${celsius.toFixed(1)} °C < 36 °C`);
  }
  if (reading.heartRate !== undefined && reading.heartRate > 90) {
    sirsCriteriaMet.push(`HR ${reading.heartRate} > 90 bpm`);
  }
  if (reading.respiratoryRate !== undefined && reading.respiratoryRate > 20) {
    sirsCriteriaMet.push(`RR ${reading.respiratoryRate} > 20 /min`);
  }

  if (reading.respiratoryRate !== undefined && reading.respiratoryRate >= 22) {
    qsofaCriteriaMet.push(`RR ${reading.respiratoryRate} >= 22 /min`);
  }
  if (reading.systolic !== undefined && reading.systolic <= 100) {
    qsofaCriteriaMet.push(`SBP ${reading.systolic} <= 100 mmHg`);
  }
  if (consciousness === 'cvpu') {
    qsofaCriteriaMet.push('Altered mentation');
  }

  const qsofaScore = qsofaCriteriaMet.length;
  const positive = sirsCriteriaMet.length >= 2 || qsofaScore >= 2;

  return {
    sirsCriteriaMet,
    qsofaScore,
    qsofaCriteriaMet,
    positive,
    recommendation: positive
      ? 'Sepsis screen POSITIVE — obtain lactate and blood cultures, and consider the sepsis bundle within 1 hour if infection is suspected.'
      : 'Sepsis screen negative — continue routine monitoring.',
  };
}

export function scoreTrend(scores: number[]): DeteriorationTrend {
  const current = scores[0] ?? 0;
  const previous = scores.length > 1 ? scores[1] : null;
  if (previous === null) {
    return { current, previous: null, delta: null, direction: 'unknown' };
  }
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? 'worsening' : delta < 0 ? 'improving' : 'stable',
  };
}
