import { calculateMews, compareMews, detectDeterioration, mewsTier } from '../src/utils/mews';
import type { VitalReading } from '../src/types';

const reading = (overrides: Partial<VitalReading>): VitalReading => ({
  id: 1,
  timestamp: '2024-01-18 14:00',
  recordedBy: 'RN Smith',
  location: 'Med-Surg 4W',
  ...overrides,
});

const stable = {
  systolic: 120,
  diastolic: 78,
  heartRate: 72,
  temperature: 98.4,
  respiratoryRate: 14,
  spo2: 98,
};

describe('calculateMews', () => {
  it('scores a fully normal reading as zero and low risk', () => {
    const result = calculateMews(reading(stable));
    expect(result.total).toBe(0);
    expect(result.tier).toBe('low');
    expect(result.missing).toHaveLength(0);
  });

  it('sums per-parameter points across all scored vitals', () => {
    const result = calculateMews(
      reading({ ...stable, systolic: 95, heartRate: 115, respiratoryRate: 24, temperature: 101.8, spo2: 91 })
    );
    // 1 (systolic) + 2 (heart rate) + 2 (resp rate) + 2 (temperature) + 2 (spo2)
    expect(result.total).toBe(9);
    expect(result.tier).toBe('critical');
    expect(result.components.map(component => component.score)).toEqual([1, 2, 2, 2, 2]);
  });

  it('scores hypertensive and hypotensive extremes', () => {
    expect(calculateMews(reading({ ...stable, systolic: 205 })).total).toBe(2);
    expect(calculateMews(reading({ ...stable, systolic: 65 })).total).toBe(3);
  });

  it('reports unrecorded parameters instead of guessing values', () => {
    const result = calculateMews(reading({ systolic: 120, heartRate: 72 }));
    expect(result.missing).toEqual(['Resp Rate', 'Temperature', 'SpO2']);
    expect(result.total).toBe(0);
  });

  it('labels the band used for each parameter', () => {
    const result = calculateMews(reading({ ...stable, heartRate: 135 }));
    const heartRate = result.components.find(component => component.key === 'heartRate');
    expect(heartRate).toMatchObject({ band: '≥130', score: 3 });
  });
});

describe('mewsTier', () => {
  it('maps totals to escalation tiers', () => {
    expect(mewsTier(1)).toBe('low');
    expect(mewsTier(3)).toBe('moderate');
    expect(mewsTier(4)).toBe('high');
    expect(mewsTier(7)).toBe('critical');
  });
});

describe('compareMews', () => {
  it('reports the direction of change between two scores', () => {
    const worse = calculateMews(reading({ ...stable, respiratoryRate: 32 }));
    const better = calculateMews(reading(stable));
    expect(compareMews(worse, better)).toEqual({ delta: 3, direction: 'rising' });
    expect(compareMews(better, worse)).toEqual({ delta: -3, direction: 'falling' });
    expect(compareMews(better, better)).toEqual({ delta: 0, direction: 'stable' });
  });
});

describe('detectDeterioration', () => {
  it('returns null without at least two readings', () => {
    expect(detectDeterioration([])).toBeNull();
    expect(detectDeterioration([reading(stable)])).toBeNull();
  });

  it('alerts when the latest score reaches the high-risk threshold', () => {
    const alert = detectDeterioration([
      reading({ id: 2, ...stable, heartRate: 115, respiratoryRate: 24 }),
      reading({ id: 1, ...stable, respiratoryRate: 22 }),
    ]);
    expect(alert?.current.tier).toBe('high');
    expect(alert?.reason).toContain('escalation threshold');
  });

  it('alerts on a two-point climb even below the high-risk threshold', () => {
    const alert = detectDeterioration([
      reading({ id: 2, ...stable, respiratoryRate: 24 }),
      reading({ id: 1, ...stable }),
    ]);
    expect(alert?.trend).toEqual({ delta: 2, direction: 'rising' });
    expect(alert?.reason).toContain('rose 2 points');
  });

  it('stays quiet when the patient is stable or improving', () => {
    expect(
      detectDeterioration([reading({ id: 2, ...stable }), reading({ id: 1, ...stable, respiratoryRate: 24 })])
    ).toBeNull();
    expect(detectDeterioration([reading({ id: 2, ...stable }), reading({ id: 1, ...stable })])).toBeNull();
  });
});
