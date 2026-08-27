import {
  calculateNews2,
  fahrenheitToCelsius,
  screenForSepsis,
  scoreTrend,
} from '../src/utils/earlyWarningScore';
import type { VitalReading } from '../src/types';

const reading = (overrides: Partial<VitalReading> = {}): VitalReading => ({
  id: 1,
  timestamp: '2024-01-18 14:00',
  systolic: 120,
  diastolic: 80,
  heartRate: 70,
  temperature: 98.6,
  respiratoryRate: 16,
  spo2: 98,
  recordedBy: 'RN Smith',
  location: 'Med-Surg 4W',
  ...overrides,
});

describe('fahrenheitToCelsius', () => {
  it('converts known values', () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37);
    expect(fahrenheitToCelsius(32)).toBeCloseTo(0);
  });
});

describe('calculateNews2', () => {
  it('scores a fully normal observation set as 0 / low risk', () => {
    const score = calculateNews2(reading());
    expect(score.total).toBe(0);
    expect(score.risk).toBe('low');
    expect(score.monitoringFrequency).toBe('Every 12 hours');
    expect(score.missingParameters).toHaveLength(0);
  });

  it('scores each deranged parameter per the NEWS2 table', () => {
    const score = calculateNews2(
      reading({ respiratoryRate: 26, spo2: 92, temperature: 103.0, systolic: 95, heartRate: 125 })
    );
    const byKey = Object.fromEntries(score.components.map(c => [c.key, c.score]));
    expect(byKey.respiratoryRate).toBe(3);
    expect(byKey.spo2).toBe(2);
    expect(byKey.temperature).toBe(2);
    expect(byKey.systolic).toBe(2);
    expect(byKey.heartRate).toBe(2);
    expect(score.total).toBe(11);
    expect(score.risk).toBe('high');
  });

  it('adds 2 points for supplemental oxygen and 3 for altered consciousness', () => {
    const score = calculateNews2(reading(), { supplementalOxygen: true, consciousness: 'cvpu' });
    expect(score.total).toBe(5);
    expect(score.risk).toBe('medium');
  });

  it('flags low-medium risk when a single parameter scores 3', () => {
    const score = calculateNews2(reading({ heartRate: 38 }));
    expect(score.total).toBe(3);
    expect(score.maxComponentScore).toBe(3);
    expect(score.risk).toBe('low-medium');
  });

  it('reports low risk with nurse review for an aggregate score of 1-4', () => {
    const score = calculateNews2(reading({ spo2: 94 }));
    expect(score.total).toBe(1);
    expect(score.risk).toBe('low');
    expect(score.monitoringFrequency).toBe('Every 4-6 hours');
  });

  it('lists parameters that were not recorded', () => {
    const score = calculateNews2(reading({ spo2: undefined, temperature: undefined }));
    expect(score.missingParameters).toEqual(['SpO2', 'Temperature']);
    expect(score.total).toBe(0);
  });
});

describe('screenForSepsis', () => {
  it('is negative for normal vitals', () => {
    const screen = screenForSepsis(reading());
    expect(screen.sirsCriteriaMet).toHaveLength(0);
    expect(screen.qsofaScore).toBe(0);
    expect(screen.positive).toBe(false);
  });

  it('is positive when two SIRS criteria are met', () => {
    const screen = screenForSepsis(reading({ temperature: 101.4, heartRate: 118 }));
    expect(screen.sirsCriteriaMet).toHaveLength(2);
    expect(screen.positive).toBe(true);
  });

  it('counts hypothermia as a SIRS criterion', () => {
    const screen = screenForSepsis(reading({ temperature: 95.0 }));
    expect(screen.sirsCriteriaMet).toHaveLength(1);
    expect(screen.positive).toBe(false);
  });

  it('is positive on qSOFA alone', () => {
    const screen = screenForSepsis(reading({ systolic: 96, respiratoryRate: 16 }), {
      consciousness: 'cvpu',
    });
    expect(screen.qsofaScore).toBe(2);
    expect(screen.positive).toBe(true);
  });
});

describe('scoreTrend', () => {
  it('detects worsening, improving and stable trends from newest-first scores', () => {
    expect(scoreTrend([7, 4]).direction).toBe('worsening');
    expect(scoreTrend([2, 6]).direction).toBe('improving');
    expect(scoreTrend([3, 3]).direction).toBe('stable');
  });

  it('returns unknown when there is no prior score', () => {
    expect(scoreTrend([5])).toEqual({ current: 5, previous: null, delta: null, direction: 'unknown' });
  });
});
