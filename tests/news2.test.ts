import {
  calculateNews2,
  classifyRisk,
  scoreConsciousness,
  scoreHeartRate,
  scoreRespiratoryRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemperatureCelsius,
} from '../src/utils/news2';

describe('NEWS2 parameter scoring', () => {
  test('respiratory rate bands', () => {
    expect([8, 9, 11, 12, 20, 21, 24, 25].map(scoreRespiratoryRate)).toEqual([3, 1, 1, 0, 0, 2, 2, 3]);
  });

  test('SpO2 scale 1 bands', () => {
    expect([91, 92, 93, 94, 95, 96].map(scoreSpo2)).toEqual([3, 2, 2, 1, 1, 0]);
  });

  test('systolic BP bands', () => {
    expect([90, 91, 100, 101, 110, 111, 219, 220].map(scoreSystolic)).toEqual([3, 2, 2, 1, 1, 0, 0, 3]);
  });

  test('pulse bands', () => {
    expect([40, 41, 50, 51, 90, 91, 110, 111, 130, 131].map(scoreHeartRate)).toEqual([3, 1, 1, 0, 0, 1, 1, 2, 2, 3]);
  });

  test('temperature bands (Celsius)', () => {
    expect([35.0, 35.1, 36.0, 36.1, 38.0, 38.1, 39.0, 39.1].map(scoreTemperatureCelsius)).toEqual([3, 1, 1, 0, 0, 1, 1, 2]);
  });

  test('consciousness: any new confusion or reduced ACVPU scores 3', () => {
    expect(scoreConsciousness('A')).toBe(0);
    (['C', 'V', 'P', 'U'] as const).forEach(level => expect(scoreConsciousness(level)).toBe(3));
  });
});

describe('NEWS2 risk classification', () => {
  test('thresholds', () => {
    expect(classifyRisk(0, false)).toBe('low');
    expect(classifyRisk(4, false)).toBe('low');
    expect(classifyRisk(3, true)).toBe('low-medium');
    expect(classifyRisk(5, false)).toBe('medium');
    expect(classifyRisk(6, true)).toBe('medium');
    expect(classifyRisk(7, false)).toBe('high');
  });
});

describe('calculateNews2', () => {
  test('healthy adult on room air scores 0', () => {
    const result = calculateNews2({ respiratoryRate: 16, spo2: 98, systolic: 120, heartRate: 72, temperature: 98.6 });
    expect(result.total).toBe(0);
    expect(result.risk).toBe('low');
    expect(result.complete).toBe(true);
  });

  test('deteriorating septic picture scores high', () => {
    const result = calculateNews2({ respiratoryRate: 30, spo2: 88, systolic: 182, heartRate: 124, temperature: 101.4 });
    expect(result.total).toBe(9);
    expect(result.risk).toBe('high');
    expect(result.hasRedScore).toBe(true);
  });

  test('supplemental oxygen and confusion are scored', () => {
    const result = calculateNews2({
      respiratoryRate: 16, spo2: 97, systolic: 120, heartRate: 72, temperature: 98.6,
      supplementalO2: true, consciousness: 'C',
    });
    expect(result.total).toBe(5);
    expect(result.risk).toBe('medium');
  });

  test('reports missing parameters as incomplete', () => {
    const result = calculateNews2({ heartRate: 72 });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['respiratoryRate', 'spo2', 'systolic', 'temperature']);
  });
});
