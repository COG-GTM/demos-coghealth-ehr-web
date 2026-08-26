import type { VitalReading } from '../types/vitals';
import type {
  SepsisAssessment,
  SepsisBundleOrder,
  SepsisCriterion,
  SepsisRiskLevel,
  SepsisRiskSummary,
} from '../types/sepsis';

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

function push(
  criteria: SepsisCriterion[],
  criterion: SepsisCriterion,
): void {
  criteria.push(criterion);
}

function sirsCriteria(reading: VitalReading): SepsisCriterion[] {
  const criteria: SepsisCriterion[] = [];

  const tempC = reading.temperature !== undefined ? fahrenheitToCelsius(reading.temperature) : undefined;
  push(criteria, {
    set: 'SIRS',
    label: 'Temperature > 38.0 °C or < 36.0 °C',
    detail: tempC === undefined ? 'Not documented' : `${reading.temperature?.toFixed(1)} °F (${tempC.toFixed(1)} °C)`,
    met: tempC !== undefined && (tempC > 38.0 || tempC < 36.0),
    points: 1,
    documented: tempC !== undefined,
  });

  push(criteria, {
    set: 'SIRS',
    label: 'Heart rate > 90 bpm',
    detail: reading.heartRate === undefined ? 'Not documented' : `${reading.heartRate} bpm`,
    met: reading.heartRate !== undefined && reading.heartRate > 90,
    points: 1,
    documented: reading.heartRate !== undefined,
  });

  push(criteria, {
    set: 'SIRS',
    label: 'Respiratory rate > 20 /min',
    detail: reading.respiratoryRate === undefined ? 'Not documented' : `${reading.respiratoryRate} /min`,
    met: reading.respiratoryRate !== undefined && reading.respiratoryRate > 20,
    points: 1,
    documented: reading.respiratoryRate !== undefined,
  });

  push(criteria, {
    set: 'SIRS',
    label: 'WBC > 12.0 or < 4.0 x10⁹/L',
    detail: 'WBC not available in flowsheet',
    met: false,
    points: 1,
    documented: false,
  });

  return criteria;
}

function qsofaCriteria(reading: VitalReading): SepsisCriterion[] {
  return [
    {
      set: 'qSOFA',
      label: 'Respiratory rate ≥ 22 /min',
      detail: reading.respiratoryRate === undefined ? 'Not documented' : `${reading.respiratoryRate} /min`,
      met: reading.respiratoryRate !== undefined && reading.respiratoryRate >= 22,
      points: 1,
      documented: reading.respiratoryRate !== undefined,
    },
    {
      set: 'qSOFA',
      label: 'Systolic BP ≤ 100 mmHg',
      detail: reading.systolic === undefined ? 'Not documented' : `${reading.systolic} mmHg`,
      met: reading.systolic !== undefined && reading.systolic <= 100,
      points: 1,
      documented: reading.systolic !== undefined,
    },
    {
      set: 'qSOFA',
      label: 'Altered mentation (GCS < 15)',
      detail: 'Mental status not documented in flowsheet',
      met: false,
      points: 1,
      documented: false,
    },
  ];
}

function mewsSystolic(systolic: number): number {
  if (systolic <= 70) return 3;
  if (systolic <= 80) return 2;
  if (systolic <= 100) return 1;
  if (systolic <= 199) return 0;
  return 2;
}

function mewsHeartRate(heartRate: number): number {
  if (heartRate <= 40) return 2;
  if (heartRate <= 50) return 1;
  if (heartRate <= 100) return 0;
  if (heartRate <= 110) return 1;
  if (heartRate <= 129) return 2;
  return 3;
}

function mewsRespiratoryRate(rr: number): number {
  if (rr < 9) return 2;
  if (rr <= 14) return 0;
  if (rr <= 20) return 1;
  if (rr <= 29) return 2;
  return 3;
}

function mewsTemperature(tempF: number): number {
  const tempC = fahrenheitToCelsius(tempF);
  if (tempC < 35) return 2;
  if (tempC <= 38.4) return 0;
  return 2;
}

function mewsCriteria(reading: VitalReading): SepsisCriterion[] {
  const criteria: SepsisCriterion[] = [];

  if (reading.systolic !== undefined) {
    const points = mewsSystolic(reading.systolic);
    push(criteria, {
      set: 'MEWS',
      label: 'Systolic BP',
      detail: `${reading.systolic} mmHg`,
      met: points > 0,
      points,
      documented: true,
    });
  }

  if (reading.heartRate !== undefined) {
    const points = mewsHeartRate(reading.heartRate);
    push(criteria, {
      set: 'MEWS',
      label: 'Heart rate',
      detail: `${reading.heartRate} bpm`,
      met: points > 0,
      points,
      documented: true,
    });
  }

  if (reading.respiratoryRate !== undefined) {
    const points = mewsRespiratoryRate(reading.respiratoryRate);
    push(criteria, {
      set: 'MEWS',
      label: 'Respiratory rate',
      detail: `${reading.respiratoryRate} /min`,
      met: points > 0,
      points,
      documented: true,
    });
  }

  if (reading.temperature !== undefined) {
    const points = mewsTemperature(reading.temperature);
    push(criteria, {
      set: 'MEWS',
      label: 'Temperature',
      detail: `${reading.temperature.toFixed(1)} °F (${fahrenheitToCelsius(reading.temperature).toFixed(1)} °C)`,
      met: points > 0,
      points,
      documented: true,
    });
  }

  push(criteria, {
    set: 'MEWS',
    label: 'AVPU / level of consciousness',
    detail: 'Not documented — scored 0',
    met: false,
    points: 0,
    documented: false,
  });

  return criteria;
}

function riskLevelFor(sirsCount: number, qsofaScore: number, mewsScore: number): SepsisRiskLevel {
  if (qsofaScore >= 2 || mewsScore >= 5 || (sirsCount >= 2 && mewsScore >= 4)) return 'high';
  if (sirsCount >= 2 || mewsScore >= 3) return 'moderate';
  return 'low';
}

/**
 * Scores a single reading. `previous` is the next-older reading, used only for the
 * MEWS trend; omit it when no prior reading is available.
 */
export function assessReading(reading: VitalReading, previous?: VitalReading): SepsisAssessment {
  const criteria = [...sirsCriteria(reading), ...qsofaCriteria(reading), ...mewsCriteria(reading)];

  const sirsCount = criteria.filter(c => c.set === 'SIRS' && c.met).length;
  const qsofaScore = criteria.filter(c => c.set === 'qSOFA' && c.met).length;
  const mewsScore = criteria
    .filter(c => c.set === 'MEWS')
    .reduce((total, c) => total + c.points, 0);

  const mewsDelta = previous ? mewsScore - mewsTotal(previous) : 0;
  const riskLevel = riskLevelFor(sirsCount, qsofaScore, mewsScore);

  return {
    readingId: reading.id,
    timestamp: reading.timestamp,
    sirsCount,
    qsofaScore,
    mewsScore,
    riskLevel,
    mewsDelta,
    recommendation: recommendationFor({ sirsCount, qsofaScore, mewsScore, riskLevel }, mewsDelta),
    criteria,
    undocumented: criteria.filter(c => !c.documented).map(c => c.label),
  };
}

function mewsTotal(reading: VitalReading): number {
  return mewsCriteria(reading).reduce((total, c) => total + c.points, 0);
}

type Scores = Pick<SepsisAssessment, 'sirsCount' | 'qsofaScore' | 'mewsScore' | 'riskLevel'>;

function recommendationFor(scores: Scores, mewsDelta: number): string {
  const rising = mewsDelta > 0 ? ' MEWS is rising versus the prior reading.' : '';
  const values = `SIRS ${scores.sirsCount}/4, qSOFA ${scores.qsofaScore}/3, MEWS ${scores.mewsScore}`;
  switch (scores.riskLevel) {
    case 'high':
      return `Sepsis criteria met (${values}).${rising} Initiate the 1-hour sepsis bundle and notify the attending physician.`;
    case 'moderate':
      return `Possible early sepsis (${values}).${rising} Consider lactate and blood cultures, and reassess vitals within 1 hour.`;
    default:
      return `No sepsis criteria met (${values}). Continue routine monitoring.`;
  }
}

/**
 * Evaluates a flowsheet timeline. `readings` may be in any chronological order;
 * the most recent reading by timestamp is treated as current.
 */
export function assessSepsisRisk(readings: VitalReading[]): SepsisRiskSummary | null {
  if (readings.length === 0) return null;

  const ordered = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const history = ordered.map((reading, index) => assessReading(reading, ordered[index + 1]));
  const current = history[0];

  return {
    current,
    history,
    mewsDelta: current.mewsDelta,
    recommendation: current.recommendation,
  };
}

export const SEPSIS_BUNDLE_ORDERS: SepsisBundleOrder[] = [
  { id: 'lactate', name: 'Lactate, serum', detail: 'STAT, then repeat in 2 hours if > 2 mmol/L', category: 'lab', defaultSelected: true },
  { id: 'cultures', name: 'Blood cultures x2', detail: 'Two sets from separate sites, before antibiotics', category: 'lab', defaultSelected: true },
  { id: 'cbc', name: 'CBC with differential', detail: 'STAT', category: 'lab', defaultSelected: true },
  { id: 'cmp', name: 'Comprehensive metabolic panel', detail: 'STAT', category: 'lab', defaultSelected: true },
  { id: 'fluids', name: 'Crystalloid bolus 30 mL/kg', detail: 'Lactated Ringer\u2019s IV, over 1 hour', category: 'fluid', defaultSelected: true },
  { id: 'antibiotics', name: 'Broad-spectrum antibiotics', detail: 'Piperacillin-tazobactam 4.5 g IV within 1 hour', category: 'medication', defaultSelected: true },
  { id: 'vitals-q1h', name: 'Vital signs every 1 hour', detail: 'Until MEWS < 3 for two consecutive readings', category: 'monitoring', defaultSelected: true },
  { id: 'uop', name: 'Strict intake & output', detail: 'Hourly urine output monitoring', category: 'monitoring', defaultSelected: false },
];
