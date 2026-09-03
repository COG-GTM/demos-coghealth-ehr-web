import { calculateNews2 } from '../src/utils/news2';
import type { VitalReading } from '../src/types';

const reading = (vitals: Partial<VitalReading>): VitalReading => ({
  id: 1,
  timestamp: '2024-01-18 14:00',
  recordedBy: 'RN Smith',
  location: 'Med-Surg 4W',
  ...vitals,
});

describe('calculateNews2', () => {
  it('scores an all-normal reading as low risk', () => {
    const result = calculateNews2(reading({
      respiratoryRate: 16,
      spo2: 98,
      systolic: 120,
      heartRate: 72,
      temperature: 98.4,
    }));

    expect(result.total).toBe(0);
    expect(result.risk).toBe('low');
    expect(result.hasRedFlag).toBe(false);
  });

  it('scores a high-risk reading using all applicable components', () => {
    const result = calculateNews2(reading({
      systolic: 182,
      heartRate: 124,
      temperature: 101.4,
      respiratoryRate: 30,
      spo2: 88,
    }));

    expect(result.total).toBe(9);
    expect(result.risk).toBe('high');
    expect(result.hasRedFlag).toBe(true);
    expect(result.components.map(component => component.points)).toEqual([3, 3, 0, 0, 2, 0, 1]);
  });

  it('marks a single red flag below five points as low-medium risk', () => {
    const result = calculateNews2(reading({
      respiratoryRate: 16,
      spo2: 91,
      systolic: 120,
      heartRate: 72,
      temperature: 98.4,
    }));

    expect(result.total).toBe(3);
    expect(result.risk).toBe('low-medium');
    expect(result.hasRedFlag).toBe(true);
  });

  it('scores missing vital fields as zero', () => {
    const result = calculateNews2(reading({}));

    expect(result.total).toBe(0);
    expect(result.hasRedFlag).toBe(false);
    expect(result.components.every(component => component.points === 0)).toBe(true);
  });

  it('rounds converted temperature to one decimal before scoring boundaries', () => {
    const lowBoundary = calculateNews2(reading({ temperature: 96.8 }));
    const normalBoundary = calculateNews2(reading({ temperature: 96.98 }));

    expect(lowBoundary.components.find(component => component.name === 'Temperature')).toEqual({
      name: 'Temperature',
      value: 36,
      points: 1,
    });
    expect(normalBoundary.components.find(component => component.name === 'Temperature')).toEqual({
      name: 'Temperature',
      value: 36.1,
      points: 0,
    });
  });
});
