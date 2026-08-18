import { computeMews, riskLevel } from '../src/utils/mews';
import type { VitalReading } from '../src/types/vitals';

const reading = (overrides: Partial<VitalReading> = {}): VitalReading => ({
  id: 1,
  timestamp: '2024-01-18 14:00',
  recordedBy: 'RN Smith',
  location: 'Med-Surg 4W',
  ...overrides,
});

describe('computeMews', () => {
  test('scores normal values as zero', () => {
    expect(computeMews(reading({
      systolic: 120,
      heartRate: 75,
      respiratoryRate: 14,
      temperature: 98.6,
    }))).toEqual({
      score: 0,
      components: {
        systolic: 0,
        heartRate: 0,
        respiratoryRate: 0,
        temperature: 0,
      },
    });
  });

  test('scores each vital at its abnormal and critical bands', () => {
    expect(computeMews(reading({
      systolic: 70,
      heartRate: 130,
      respiratoryRate: 30,
      temperature: 100.5,
    }))).toEqual({
      score: 11,
      components: {
        systolic: 3,
        heartRate: 3,
        respiratoryRate: 3,
        temperature: 2,
      },
    });

    expect(computeMews(reading({
      systolic: 200,
      heartRate: 40,
      respiratoryRate: 15,
      temperature: 95,
    })).components).toEqual({
      systolic: 2,
      heartRate: 1,
      respiratoryRate: 1,
      temperature: 1,
    });
  });

  test('skips missing vital values', () => {
    expect(computeMews(reading())).toEqual({
      score: 0,
      components: {
        systolic: 0,
        heartRate: 0,
        respiratoryRate: 0,
        temperature: 0,
      },
    });
  });
});

describe('riskLevel', () => {
  test.each([
    [0, 'low'],
    [2, 'low'],
    [3, 'medium'],
    [4, 'medium'],
    [5, 'high'],
    [8, 'high'],
  ])('classifies score %i as %s risk', (score, level) => {
    expect(riskLevel(score)).toBe(level);
  });
});
