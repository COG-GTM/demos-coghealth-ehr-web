import type { VitalReading } from '../src/types';
import {
  calculateNews2,
  fahrenheitToCelsius,
  getNews2Risk,
  scoreHeartRate,
  scoreRespiratoryRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemperatureF,
} from '../src/utils/news2';

const baseReading: VitalReading = {
  id: 1,
  timestamp: '2024-01-18 14:00',
  recordedBy: 'RN Smith',
  location: 'Med-Surg 4W',
};

describe('NEWS2 component scoring', () => {
  it.each([
    [8, 3], [9, 1], [12, 0], [20, 0], [21, 2], [25, 3],
  ])('scores respiratory rate %s as %s', (value, expected) => {
    expect(scoreRespiratoryRate(value)).toBe(expected);
  });

  it.each([
    [91, 3], [92, 2], [94, 1], [96, 0],
  ])('scores SpO2 %s as %s', (value, expected) => {
    expect(scoreSpo2(value)).toBe(expected);
  });

  it.each([
    [90, 3], [91, 2], [101, 1], [111, 0], [219, 0], [220, 3],
  ])('scores systolic blood pressure %s as %s', (value, expected) => {
    expect(scoreSystolic(value)).toBe(expected);
  });

  it.each([
    [40, 3], [41, 1], [51, 0], [91, 1], [111, 2], [131, 3],
  ])('scores heart rate %s as %s', (value, expected) => {
    expect(scoreHeartRate(value)).toBe(expected);
  });

  it.each([
    [95.0, 3], [96.8, 1], [98.6, 0], [100.6, 1], [102.4, 2],
  ])('scores temperature %s°F as %s', (value, expected) => {
    expect(scoreTemperatureF(value)).toBe(expected);
  });

  it('converts Fahrenheit to Celsius', () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37);
  });
});

describe('calculateNews2', () => {
  it('calculates the default high-risk reading', () => {
    const reading: VitalReading = {
      ...baseReading,
      id: 6,
      systolic: 182,
      heartRate: 124,
      temperature: 101.4,
      respiratoryRate: 30,
      spo2: 88,
    };

    expect(calculateNews2(reading)).toEqual({
      total: 9,
      components: {
        respiratoryRate: 3,
        spo2: 3,
        systolic: 0,
        heartRate: 2,
        temperature: 1,
      },
      risk: 'high',
      hasRedFlag: true,
      complete: true,
    });
  });

  it('marks a reading with missing NEWS2 inputs incomplete', () => {
    const result = calculateNews2({
      ...baseReading,
      systolic: 120,
      heartRate: 80,
      temperature: 98.6,
      respiratoryRate: 16,
    });

    expect(result.complete).toBe(false);
    expect(result.components.spo2).toBe(0);
  });
});

describe('getNews2Risk', () => {
  it.each([
    [0, false, 'low'],
    [3, true, 'low-medium'],
    [5, false, 'medium'],
    [7, false, 'high'],
  ] as const)('maps total %s and red flag %s to %s', (total, hasRedFlag, expected) => {
    expect(getNews2Risk(total, hasRedFlag)).toBe(expected);
  });
});
