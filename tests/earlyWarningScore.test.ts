import { calculateNews2Trend, fahrenheitToCelsius, scoreNews2 } from '../src/utils/earlyWarningScore';
import type { VitalReading } from '../src/types';

const reading = (overrides: Partial<VitalReading> = {}): VitalReading => ({
  id: 1,
  timestamp: '2024-01-18 14:00',
  systolic: 120,
  heartRate: 70,
  temperature: 98.6,
  respiratoryRate: 16,
  spo2: 98,
  recordedBy: 'RN Test',
  location: 'Test',
  ...overrides,
});

describe('NEWS2 scoring', () => {
  test('scores standard boundary values', () => {
    expect(scoreNews2(reading({ respiratoryRate: 8 })).scores.respiratoryRate).toBe(3);
    expect(scoreNews2(reading({ respiratoryRate: 9 })).scores.respiratoryRate).toBe(1);
    expect(scoreNews2(reading({ respiratoryRate: 12 })).scores.respiratoryRate).toBe(0);
    expect(scoreNews2(reading({ respiratoryRate: 21 })).scores.respiratoryRate).toBe(2);
    expect(scoreNews2(reading({ respiratoryRate: 25 })).scores.respiratoryRate).toBe(3);
    expect(scoreNews2(reading({ spo2: 91 })).scores.spo2).toBe(3);
    expect(scoreNews2(reading({ spo2: 92 })).scores.spo2).toBe(2);
    expect(scoreNews2(reading({ spo2: 94 })).scores.spo2).toBe(1);
    expect(scoreNews2(reading({ spo2: 96 })).scores.spo2).toBe(0);
    expect(scoreNews2(reading({ systolic: 90 })).scores.systolic).toBe(3);
    expect(scoreNews2(reading({ systolic: 91 })).scores.systolic).toBe(2);
    expect(scoreNews2(reading({ systolic: 101 })).scores.systolic).toBe(1);
    expect(scoreNews2(reading({ systolic: 220 })).scores.systolic).toBe(3);
    expect(scoreNews2(reading({ heartRate: 40 })).scores.heartRate).toBe(3);
    expect(scoreNews2(reading({ heartRate: 41 })).scores.heartRate).toBe(1);
    expect(scoreNews2(reading({ heartRate: 91 })).scores.heartRate).toBe(1);
    expect(scoreNews2(reading({ heartRate: 111 })).scores.heartRate).toBe(2);
    expect(scoreNews2(reading({ heartRate: 131 })).scores.heartRate).toBe(3);
  });

  test('converts Fahrenheit and scores temperature boundaries', () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37);
    expect(scoreNews2(reading({ temperature: 95 })).scores.temperature).toBe(3);
    expect(scoreNews2(reading({ temperature: 96.8 })).scores.temperature).toBe(1);
    expect(scoreNews2(reading({ temperature: 100.4 })).scores.temperature).toBe(0);
    expect(scoreNews2(reading({ temperature: 100.58 })).scores.temperature).toBe(1);
    expect(scoreNews2(reading({ temperature: 102.38 })).scores.temperature).toBe(2);
  });

  test('applies the red-score rule and risk bands', () => {
    const oneRed = scoreNews2(reading({ respiratoryRate: 8 }));
    expect(oneRed.totalScore).toBe(3);
    expect(oneRed.hasRedScore).toBe(true);
    expect(oneRed.riskBand).toBe('low-medium');

    expect(scoreNews2(reading()).riskBand).toBe('low');
    expect(scoreNews2(reading({ respiratoryRate: 21, spo2: 92, heartRate: 111 })).riskBand).toBe('medium');
    expect(scoreNews2(reading({ respiratoryRate: 30, spo2: 88, heartRate: 131, systolic: 90 })).riskBand).toBe('high');
    expect(scoreNews2(reading(), 'V').scores.consciousness).toBe(3);
  });

  test('returns driving parameters and score trend delta', () => {
    const previous = reading();
    const current = reading({ respiratoryRate: 26, spo2: 90, heartRate: 118 });
    const result = scoreNews2(current);
    expect(result.drivingParameters).toEqual(['respiratoryRate', 'spo2', 'heartRate']);

    expect(calculateNews2Trend(current, previous)).toEqual({
      currentScore: 8,
      previousScore: 0,
      delta: 8,
      direction: 'up',
    });
    expect(calculateNews2Trend(previous, current).direction).toBe('down');
    expect(calculateNews2Trend(previous, previous).direction).toBe('stable');
  });
});
