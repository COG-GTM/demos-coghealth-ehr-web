export type TrendDirection = 'up' | 'down' | 'stable';

const LOWER_IS_BETTER = ['systolic', 'diastolic', 'heartRate', 'temperature', 'respiratoryRate', 'painLevel'];
const HIGHER_IS_BETTER = ['spo2'];

export const trendThreshold = (vitalKey: string) =>
  vitalKey === 'temperature' ? 0.3 : vitalKey === 'spo2' ? 1 : 3;

export const classifyTrend = (vitalKey: string, previous: number, current: number): TrendDirection => {
  const diff = current - previous;
  if (Math.abs(diff) < trendThreshold(vitalKey)) return 'stable';
  return diff > 0 ? 'up' : 'down';
};

export type TrendAssessment = 'improving' | 'worsening' | null;

export const assessTrend = (vitalKey: string, trend: TrendDirection): TrendAssessment => {
  if (trend === 'stable') return null;
  if (HIGHER_IS_BETTER.includes(vitalKey)) return trend === 'up' ? 'improving' : 'worsening';
  if (LOWER_IS_BETTER.includes(vitalKey)) return trend === 'down' ? 'improving' : 'worsening';
  return null;
};

const DIRECTION_WORDS: Record<TrendDirection, string> = { up: 'rising', down: 'falling', stable: 'stable' };

export const describeTrend = (vitalKey: string, trend: TrendDirection) => {
  const assessment = assessTrend(vitalKey, trend);
  return assessment ? `${DIRECTION_WORDS[trend]}, ${assessment}` : DIRECTION_WORDS[trend];
};

export const formatVitalValue = (vitalKey: string, value: number) =>
  vitalKey === 'temperature' ? value.toFixed(1) : String(value);

/** `newestFirst` mirrors the flowsheet column order (most recent reading first). */
export const sparklineLabel = (name: string, unit: string, vitalKey: string, newestFirst: number[]) => {
  if (newestFirst.length < 2) return null;
  const oldest = newestFirst[newestFirst.length - 1];
  const newest = newestFirst[0];
  const trend = classifyTrend(vitalKey, oldest, newest);
  return `${name} trend over ${newestFirst.length} readings: ${formatVitalValue(vitalKey, oldest)} to ${formatVitalValue(vitalKey, newest)} ${unit}, ${describeTrend(vitalKey, trend)}`;
};

/** Plots oldest on the left and newest on the right so the line matches `sparklineLabel`. */
export const sparklinePoints = (newestFirst: number[], width: number, height: number) => {
  const chronological = [...newestFirst].reverse();
  const min = Math.min(...chronological);
  const range = Math.max(...chronological) - min || 1;
  return chronological.map((v, i) => {
    const x = (i / (chronological.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
};
