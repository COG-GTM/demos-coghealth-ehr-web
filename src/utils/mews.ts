import type { VitalReading } from '../types';

export type MewsTier = 'low' | 'moderate' | 'high' | 'critical';

export interface MewsComponent {
  key: keyof VitalReading;
  label: string;
  value?: number;
  unit: string;
  score: number;
  band: string;
}

export interface MewsResult {
  total: number;
  components: MewsComponent[];
  missing: string[];
  tier: MewsTier;
  tierLabel: string;
  recommendation: string;
  monitoringFrequency: string;
}

export interface MewsTrend {
  delta: number;
  direction: 'rising' | 'falling' | 'stable';
}

export interface DeteriorationAlert {
  current: MewsResult;
  previous: MewsResult;
  trend: MewsTrend;
  reason: string;
}

interface Band {
  max?: number;
  score: number;
  label: string;
}

const bandsFor = (bands: Band[], value: number): Band =>
  bands.find(band => band.max === undefined || value <= band.max) ?? bands[bands.length - 1];

const systolicBands: Band[] = [
  { max: 70, score: 3, label: '≤70' },
  { max: 80, score: 2, label: '71-80' },
  { max: 100, score: 1, label: '81-100' },
  { max: 199, score: 0, label: '101-199' },
  { score: 2, label: '≥200' },
];

const heartRateBands: Band[] = [
  { max: 40, score: 2, label: '≤40' },
  { max: 50, score: 1, label: '41-50' },
  { max: 100, score: 0, label: '51-100' },
  { max: 110, score: 1, label: '101-110' },
  { max: 129, score: 2, label: '111-129' },
  { score: 3, label: '≥130' },
];

const respiratoryRateBands: Band[] = [
  { max: 8, score: 2, label: '<9' },
  { max: 14, score: 0, label: '9-14' },
  { max: 20, score: 1, label: '15-20' },
  { max: 29, score: 2, label: '21-29' },
  { score: 3, label: '≥30' },
];

// Temperature bands use °F to match the flowsheet; equivalent to <35°C / 35-38.4°C / ≥38.5°C.
const temperatureBands: Band[] = [
  { max: 94.9, score: 2, label: '<95.0' },
  { max: 101.2, score: 0, label: '95.0-101.2' },
  { score: 2, label: '≥101.3' },
];

const spo2Bands: Band[] = [
  { max: 89, score: 3, label: '<90' },
  { max: 92, score: 2, label: '90-92' },
  { max: 94, score: 1, label: '93-94' },
  { score: 0, label: '≥95' },
];

const definitions: { key: keyof VitalReading; label: string; unit: string; bands: Band[] }[] = [
  { key: 'systolic', label: 'BP Systolic', unit: 'mmHg', bands: systolicBands },
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', bands: heartRateBands },
  { key: 'respiratoryRate', label: 'Resp Rate', unit: '/min', bands: respiratoryRateBands },
  { key: 'temperature', label: 'Temperature', unit: '°F', bands: temperatureBands },
  { key: 'spo2', label: 'SpO2', unit: '%', bands: spo2Bands },
];

const tiers: Record<MewsTier, { label: string; recommendation: string; monitoringFrequency: string }> = {
  low: {
    label: 'Low Risk',
    recommendation: 'Continue routine monitoring per unit protocol.',
    monitoringFrequency: 'Every 4-8 hours',
  },
  moderate: {
    label: 'Moderate Risk',
    recommendation: 'Notify the charge nurse and increase observation frequency.',
    monitoringFrequency: 'Every 2 hours',
  },
  high: {
    label: 'High Risk',
    recommendation: 'Page the covering provider for urgent bedside assessment.',
    monitoringFrequency: 'Every hour',
  },
  critical: {
    label: 'Critical Risk',
    recommendation: 'Activate the Rapid Response Team and consider transfer to a higher level of care.',
    monitoringFrequency: 'Continuous',
  },
};

export function mewsTier(total: number): MewsTier {
  if (total >= 5) return 'critical';
  if (total >= 4) return 'high';
  if (total >= 2) return 'moderate';
  return 'low';
}

export function calculateMews(reading: VitalReading): MewsResult {
  const components: MewsComponent[] = [];
  const missing: string[] = [];

  for (const definition of definitions) {
    const value = reading[definition.key] as number | undefined;
    if (value === undefined) {
      missing.push(definition.label);
      components.push({
        key: definition.key,
        label: definition.label,
        unit: definition.unit,
        score: 0,
        band: 'not recorded',
      });
      continue;
    }
    const band = bandsFor(definition.bands, value);
    components.push({
      key: definition.key,
      label: definition.label,
      value,
      unit: definition.unit,
      score: band.score,
      band: band.label,
    });
  }

  const total = components.reduce((sum, component) => sum + component.score, 0);
  const tier = mewsTier(total);

  return {
    total,
    components,
    missing,
    tier,
    tierLabel: tiers[tier].label,
    recommendation: tiers[tier].recommendation,
    monitoringFrequency: tiers[tier].monitoringFrequency,
  };
}

export function compareMews(current: MewsResult, previous: MewsResult): MewsTrend {
  const delta = current.total - previous.total;
  if (delta === 0) return { delta, direction: 'stable' };
  return { delta, direction: delta > 0 ? 'rising' : 'falling' };
}

const DETERIORATION_DELTA = 2;

/**
 * Detects clinical deterioration from a flowsheet ordered newest reading first.
 * Fires when the latest score reaches the high tier or climbs by two or more points.
 */
export function detectDeterioration(readings: VitalReading[]): DeteriorationAlert | null {
  if (readings.length < 2) return null;

  const current = calculateMews(readings[0]);
  const previous = calculateMews(readings[1]);
  const trend = compareMews(current, previous);

  if (current.total >= 4) {
    return {
      current,
      previous,
      trend,
      reason: `MEWS ${current.total} meets the ${current.tierLabel.toLowerCase()} escalation threshold.`,
    };
  }

  if (trend.delta >= DETERIORATION_DELTA) {
    return {
      current,
      previous,
      trend,
      reason: `MEWS rose ${trend.delta} points since the previous reading (${previous.total} → ${current.total}).`,
    };
  }

  return null;
}
