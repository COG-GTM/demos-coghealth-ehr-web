import type { VitalReading } from '../types';

export type News2Consciousness = 'A' | 'V' | 'P' | 'U';
export type News2RiskBand = 'low' | 'low-medium' | 'medium' | 'high';
export type News2Parameter = 'respiratoryRate' | 'spo2' | 'temperature' | 'systolic' | 'heartRate' | 'consciousness';

export interface News2SubScores {
  respiratoryRate: number;
  spo2: number;
  temperature: number;
  systolic: number;
  heartRate: number;
  consciousness: number;
}

export interface News2ScoreResult {
  totalScore: number;
  scores: News2SubScores;
  hasRedScore: boolean;
  riskBand: News2RiskBand;
  drivingParameters: News2Parameter[];
  monitoringFrequency: string;
  clinicalResponse: string;
}

export interface News2Trend {
  currentScore: number;
  previousScore: number;
  delta: number;
  direction: 'up' | 'down' | 'stable';
}

export const fahrenheitToCelsius = (fahrenheit: number): number => (fahrenheit - 32) * 5 / 9;

const scoreRespiratoryRate = (value: number | undefined): number => {
  if (value === undefined) return 0;
  if (value <= 8) return 3;
  if (value <= 11) return 1;
  if (value <= 20) return 0;
  if (value <= 24) return 2;
  return 3;
};

// Scale 1 is used because the VitalReading model does not include a COPD/target-saturation flag.
const scoreSpo2 = (value: number | undefined): number => {
  if (value === undefined) return 0;
  if (value <= 91) return 3;
  if (value <= 93) return 2;
  if (value <= 95) return 1;
  return 0;
};

const scoreTemperature = (fahrenheit: number | undefined): number => {
  if (fahrenheit === undefined) return 0;
  const celsius = fahrenheitToCelsius(fahrenheit);
  if (celsius <= 35) return 3;
  if (celsius <= 36) return 1;
  if (celsius <= 38) return 0;
  if (celsius <= 39) return 1;
  return 2;
};

const scoreSystolic = (value: number | undefined): number => {
  if (value === undefined) return 0;
  if (value <= 90) return 3;
  if (value <= 100) return 2;
  if (value <= 110) return 1;
  if (value <= 219) return 0;
  return 3;
};

const scoreHeartRate = (value: number | undefined): number => {
  if (value === undefined) return 0;
  if (value <= 40) return 3;
  if (value <= 50) return 1;
  if (value <= 90) return 0;
  if (value <= 110) return 1;
  if (value <= 130) return 2;
  return 3;
};

const scoreConsciousness = (value: News2Consciousness): number => value === 'A' ? 0 : 3;

const getRiskBand = (totalScore: number, hasRedScore: boolean): News2RiskBand => {
  if (totalScore >= 7) return 'high';
  if (totalScore >= 5) return 'medium';
  if (hasRedScore) return 'low-medium';
  return 'low';
};

const getResponse = (riskBand: News2RiskBand): Pick<News2ScoreResult, 'monitoringFrequency' | 'clinicalResponse'> => {
  if (riskBand === 'high') {
    return {
      monitoringFrequency: 'Continuous monitoring',
      clinicalResponse: 'Emergency response: immediate senior clinical review and consider critical care assessment.',
    };
  }
  if (riskBand === 'medium') {
    return {
      monitoringFrequency: 'At least hourly',
      clinicalResponse: 'Urgent response: prompt senior clinical review and assessment for an underlying cause.',
    };
  }
  if (riskBand === 'low-medium') {
    return {
      monitoringFrequency: 'At least hourly',
      clinicalResponse: 'Urgent response: registered nurse review and clinician assessment of the parameter scoring 3.',
    };
  }
  return {
    monitoringFrequency: 'At least every 12 hours',
    clinicalResponse: 'Continue routine NEWS2 monitoring and assess for any clinical concern.',
  };
};

export const scoreNews2 = (
  reading: VitalReading,
  consciousness: News2Consciousness = 'A',
): News2ScoreResult => {
  const scores: News2SubScores = {
    respiratoryRate: scoreRespiratoryRate(reading.respiratoryRate),
    spo2: scoreSpo2(reading.spo2),
    temperature: scoreTemperature(reading.temperature),
    systolic: scoreSystolic(reading.systolic),
    heartRate: scoreHeartRate(reading.heartRate),
    consciousness: scoreConsciousness(consciousness),
  };
  const totalScore = Object.values(scores).reduce((total, score) => total + score, 0);
  const hasRedScore = Object.values(scores).some(score => score === 3);
  const riskBand = getRiskBand(totalScore, hasRedScore);
  const response = getResponse(riskBand);

  return {
    totalScore,
    scores,
    hasRedScore,
    riskBand,
    drivingParameters: (Object.keys(scores) as News2Parameter[]).filter(parameter => scores[parameter] > 0),
    ...response,
  };
};

export const calculateNews2Trend = (
  currentReading: VitalReading,
  previousReading?: VitalReading,
  currentConsciousness: News2Consciousness = 'A',
  previousConsciousness: News2Consciousness = 'A',
): News2Trend => {
  const currentScore = scoreNews2(currentReading, currentConsciousness).totalScore;
  const previousScore = previousReading ? scoreNews2(previousReading, previousConsciousness).totalScore : currentScore;
  const delta = currentScore - previousScore;

  return {
    currentScore,
    previousScore,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
  };
};
