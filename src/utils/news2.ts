import type { VitalReading } from '../types';

export type News2Risk = 'low' | 'low-medium' | 'medium' | 'high';

export interface News2Result {
  total: number;
  components: {
    respiratoryRate: number;
    spo2: number;
    systolic: number;
    heartRate: number;
    temperature: number;
  };
  risk: News2Risk;
  hasRedFlag: boolean;
  complete: boolean;
}

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9;
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

export function scoreTemperatureF(tempF: number): number {
  const temperatureCelsius = Math.round(fahrenheitToCelsius(tempF) * 10) / 10;
  if (temperatureCelsius <= 35.0) return 3;
  if (temperatureCelsius <= 36.0) return 1;
  if (temperatureCelsius <= 38.0) return 0;
  if (temperatureCelsius <= 39.0) return 1;
  return 2;
}

export function getNews2Risk(total: number, hasRedFlag: boolean): News2Risk {
  if (total >= 7) return 'high';
  if (total >= 5) return 'medium';
  return hasRedFlag ? 'low-medium' : 'low';
}

export function calculateNews2(reading: VitalReading): News2Result {
  const components = {
    respiratoryRate: reading.respiratoryRate === undefined ? 0 : scoreRespiratoryRate(reading.respiratoryRate),
    spo2: reading.spo2 === undefined ? 0 : scoreSpo2(reading.spo2),
    systolic: reading.systolic === undefined ? 0 : scoreSystolic(reading.systolic),
    heartRate: reading.heartRate === undefined ? 0 : scoreHeartRate(reading.heartRate),
    temperature: reading.temperature === undefined ? 0 : scoreTemperatureF(reading.temperature),
  };
  const total = Object.values(components).reduce((sum, score) => sum + score, 0);
  const hasRedFlag = Object.values(components).some(score => score === 3);
  const complete = reading.respiratoryRate !== undefined
    && reading.spo2 !== undefined
    && reading.systolic !== undefined
    && reading.heartRate !== undefined
    && reading.temperature !== undefined;

  return {
    total,
    components,
    risk: getNews2Risk(total, hasRedFlag),
    hasRedFlag,
    complete,
  };
}
