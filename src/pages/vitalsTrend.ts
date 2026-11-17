export type TrendDirection = 'up' | 'down' | 'stable';
export type TrendAssessment = 'improving' | 'worsening' | 'neutral';

const GOOD_UP = ['spo2'];
const GOOD_DOWN = ['systolic', 'diastolic', 'heartRate', 'temperature', 'respiratoryRate', 'painLevel'];

export function assessTrend(trend: TrendDirection, vitalKey: string): TrendAssessment {
  if (trend === 'stable') return 'neutral';
  const goodUp = GOOD_UP.includes(vitalKey);
  const goodDown = GOOD_DOWN.includes(vitalKey);
  if (!goodUp && !goodDown) return 'neutral';
  const improving = trend === 'up' ? goodUp : goodDown;
  return improving ? 'improving' : 'worsening';
}

export function describeTrend(trend: TrendDirection, vitalKey: string): string {
  if (trend === 'stable') return 'stable';
  const direction = trend === 'up' ? 'rising' : 'falling';
  const assessment = assessTrend(trend, vitalKey);
  return assessment === 'neutral' ? direction : `${direction} (${assessment})`;
}

/** Summary of a newest-first series, e.g. "trend: rising, latest abnormal". */
export function describeSparkline(
  newestFirst: number[],
  normalRange: { min: number; max: number },
): string | null {
  if (newestFirst.length < 2) return null;
  const latest = newestFirst[0];
  const oldest = newestFirst[newestFirst.length - 1];
  const direction = latest > oldest ? 'rising' : latest < oldest ? 'falling' : 'flat';
  const status = latest < normalRange.min || latest > normalRange.max ? 'abnormal' : 'normal';
  return `trend: ${direction}, latest ${status}`;
}
