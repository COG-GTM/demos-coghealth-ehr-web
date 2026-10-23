import {
  calculateNews2,
  getNews2Risk,
  scoreHeartRate,
  scoreRespiratoryRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemperatureC,
} from '../src/utils/news2';

const base = { id: 1, timestamp: '2024-01-18 14:00', recordedBy: 'RN', location: 'Ward' };

describe('NEWS2 parameter bands', () => {
  test('respiratory rate', () => {
    expect([8, 9, 11, 12, 20, 21, 24, 25].map(scoreRespiratoryRate)).toEqual([3, 1, 1, 0, 0, 2, 2, 3]);
  });
  test('SpO2 scale 1', () => {
    expect([91, 92, 93, 94, 95, 96].map(scoreSpo2)).toEqual([3, 2, 2, 1, 1, 0]);
  });
  test('systolic BP', () => {
    expect([90, 91, 100, 101, 110, 111, 219, 220].map(scoreSystolic)).toEqual([3, 2, 2, 1, 1, 0, 0, 3]);
  });
  test('pulse', () => {
    expect([40, 41, 50, 51, 90, 91, 110, 111, 130, 131].map(scoreHeartRate)).toEqual([3, 1, 1, 0, 0, 1, 1, 2, 2, 3]);
  });
  test('temperature (°C)', () => {
    expect([35.0, 35.1, 36.0, 36.1, 38.0, 38.1, 39.0, 39.1].map(scoreTemperatureC)).toEqual([3, 1, 1, 0, 0, 1, 1, 2]);
  });
});

describe('NEWS2 risk thresholds', () => {
  test('aggregate thresholds and single red score', () => {
    expect(getNews2Risk(0, false)).toBe('NONE');
    expect(getNews2Risk(3, false)).toBe('LOW');
    expect(getNews2Risk(3, true)).toBe('LOW_MEDIUM');
    expect(getNews2Risk(5, false)).toBe('MEDIUM');
    expect(getNews2Risk(7, true)).toBe('HIGH');
  });
});

describe('calculateNews2', () => {
  test('healthy adult on room air scores 0', () => {
    const r = calculateNews2({ ...base, respiratoryRate: 16, spo2: 98, systolic: 120, heartRate: 72, temperature: 98.6, onOxygen: false, consciousness: 'A' });
    expect(r.total).toBe(0);
    expect(r.risk).toBe('NONE');
    expect(r.missing).toEqual([]);
  });

  test('septic presentation on oxygen with new confusion is high risk', () => {
    const r = calculateNews2({
      ...base, respiratoryRate: 30, spo2: 88, systolic: 182, heartRate: 124, temperature: 101.4, onOxygen: true, consciousness: 'C',
    });
    // RR 3 + SpO2 3 + O2 2 + SBP 0 + HR 2 + CVPU 3 + Temp(38.6C) 1
    expect(r.total).toBe(14);
    expect(r.risk).toBe('HIGH');
    expect(r.hasRedScore).toBe(true);
  });

  test('incomplete readings are not risk-classified', () => {
    const r = calculateNews2({ ...base, heartRate: 80 });
    expect(r.missing).toEqual(['respiratoryRate', 'spo2', 'onOxygen', 'systolic', 'consciousness', 'temperature']);
    expect(r.complete).toBe(false);
    expect(r.risk).toBe('INCOMPLETE');
  });

  test('unassessed oxygen / consciousness are missing, not assumed normal', () => {
    const r = calculateNews2({ ...base, respiratoryRate: 16, spo2: 98, systolic: 120, heartRate: 72, temperature: 98.6 });
    expect(r.missing).toEqual(['onOxygen', 'consciousness']);
    expect(r.risk).toBe('INCOMPLETE');
  });
});
