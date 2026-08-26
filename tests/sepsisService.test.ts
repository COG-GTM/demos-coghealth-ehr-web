import {
  assessReading,
  assessSepsisRisk,
  fahrenheitToCelsius,
} from '../src/services/sepsisService';
import type { VitalReading } from '../src/types/vitals';

const readings: VitalReading[] = [
  { id: 1, timestamp: '2024-01-18 14:00', systolic: 96, diastolic: 58, heartRate: 122, temperature: 101.8, respiratoryRate: 28, spo2: 90, weight: 82.5, painLevel: 6, recordedBy: 'RN Smith', location: 'Med-Surg 4W' },
  { id: 2, timestamp: '2024-01-18 10:00', systolic: 108, diastolic: 64, heartRate: 114, temperature: 101.0, respiratoryRate: 26, spo2: 91, weight: 82.5, painLevel: 5, recordedBy: 'RN Johnson', location: 'Med-Surg 4W' },
  { id: 3, timestamp: '2024-01-18 06:00', systolic: 118, diastolic: 70, heartRate: 104, temperature: 100.4, respiratoryRate: 22, spo2: 93, weight: 82.8, painLevel: 4, recordedBy: 'RN Williams', location: 'Med-Surg 4W' },
  { id: 4, timestamp: '2024-01-17 22:00', systolic: 126, diastolic: 76, heartRate: 96, temperature: 99.8, respiratoryRate: 20, spo2: 94, weight: 83.0, painLevel: 3, recordedBy: 'RN Davis', location: 'Med-Surg 4W' },
  { id: 5, timestamp: '2024-01-17 18:00', systolic: 132, diastolic: 80, heartRate: 88, temperature: 99.2, respiratoryRate: 18, spo2: 96, weight: 83.2, painLevel: 2, recordedBy: 'RN Brown', location: 'Med-Surg 4W' },
  { id: 6, timestamp: '2024-01-17 14:00', systolic: 134, diastolic: 82, heartRate: 84, temperature: 98.8, respiratoryRate: 16, spo2: 97, weight: 83.5, painLevel: 2, recordedBy: 'RN Miller', location: 'ED' },
  { id: 7, timestamp: '2024-01-17 10:00', systolic: 138, diastolic: 84, heartRate: 78, temperature: 98.4, respiratoryRate: 16, spo2: 98, weight: 82.0, painLevel: 1, recordedBy: 'RN Wilson', location: 'Clinic' },
  { id: 8, timestamp: '2024-01-16 14:00', systolic: 136, diastolic: 82, heartRate: 74, temperature: 98.2, respiratoryRate: 14, spo2: 98, weight: 82.0, painLevel: 0, recordedBy: 'RN Taylor', location: 'Clinic' },
];

describe('sepsisService', () => {
  it.each([
    [readings[0], 3, 2, 7, 'high'],
    [readings[1], 3, 1, 4, 'high'],
    [readings[2], 2, 1, 3, 'moderate'],
    [readings[3], 1, 0, 1, 'low'],
    [readings[7], 0, 0, 0, 'low'],
  ])('assesses reading %s', (reading, sirsCount, qsofaScore, mewsScore, riskLevel) => {
    const assessment = assessReading(reading);
    expect(assessment.sirsCount).toBe(sirsCount);
    expect(assessment.qsofaScore).toBe(qsofaScore);
    expect(assessment.mewsScore).toBe(mewsScore);
    expect(assessment.riskLevel).toBe(riskLevel);
  });

  it('converts Fahrenheit to Celsius', () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37.0);
  });

  it('assesses the full timeline', () => {
    const summary = assessSepsisRisk(readings);
    expect(summary?.current.readingId).toBe(1);
    expect(summary?.history).toHaveLength(8);
    expect(summary?.mewsDelta).toBe(3);
    expect(summary?.recommendation.toLowerCase()).toContain('sepsis bundle');
  });

  it('scopes assessment recommendations and MEWS deltas to each reading', () => {
    const summary = assessSepsisRisk(readings);
    const readingThree = summary?.history.find(assessment => assessment.readingId === 3);
    const oldestReading = summary?.history.find(assessment => assessment.readingId === 8);

    expect(readingThree?.mewsDelta).toBe(2);
    expect(readingThree?.riskLevel).toBe('moderate');
    expect(readingThree?.recommendation).toContain('Possible early sepsis');
    expect(readingThree?.recommendation).toContain('MEWS 3');
    expect(readingThree?.recommendation).not.toContain('1-hour sepsis bundle');
    expect(oldestReading?.mewsDelta).toBe(0);
    expect(assessReading(readings[0]).mewsDelta).toBe(0);
    expect(summary?.recommendation).toBe(summary?.current.recommendation);
  });

  it('returns null for an empty timeline', () => {
    expect(assessSepsisRisk([])).toBeNull();
  });

  it('marks WBC, altered mentation, and AVPU as not documented', () => {
    readings.forEach(reading => {
      const assessment = assessReading(reading);
      expect(assessment.criteria.find(criterion => criterion.label.startsWith('WBC'))?.documented).toBe(false);
      expect(assessment.criteria.find(criterion => criterion.label.startsWith('Altered mentation'))?.documented).toBe(false);
      expect(assessment.criteria.find(criterion => criterion.label.startsWith('AVPU'))?.documented).toBe(false);
    });
  });
});
