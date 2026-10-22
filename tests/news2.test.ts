import {
  calculateNews2,
  fahrenheitToCelsius,
  getNews2Response,
  isNews2Actionable,
  scoreHeartRate,
  scoreRespiratoryRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemperatureC,
} from '../src/utils/news2';

describe('NEWS2 parameter scoring', () => {
  it('scores respiration rate bands', () => {
    expect([8, 9, 11, 12, 20, 21, 24, 25].map(scoreRespiratoryRate)).toEqual([3, 1, 1, 0, 0, 2, 2, 3]);
  });

  it('scores SpO2 scale 1 bands', () => {
    expect([91, 92, 93, 94, 95, 96].map(scoreSpo2)).toEqual([3, 2, 2, 1, 1, 0]);
  });

  it('scores systolic BP bands', () => {
    expect([90, 91, 100, 101, 110, 111, 219, 220].map(scoreSystolic)).toEqual([3, 2, 2, 1, 1, 0, 0, 3]);
  });

  it('scores pulse bands', () => {
    expect([40, 41, 50, 51, 90, 91, 110, 111, 130, 131].map(scoreHeartRate)).toEqual([3, 1, 1, 0, 0, 1, 1, 2, 2, 3]);
  });

  it('scores temperature bands in celsius', () => {
    expect([35.0, 35.1, 36.0, 36.1, 38.0, 38.1, 39.0, 39.1].map(scoreTemperatureC)).toEqual([3, 1, 1, 0, 0, 1, 1, 2]);
  });

  it('converts fahrenheit to celsius rounded to one decimal', () => {
    expect(fahrenheitToCelsius(98.6)).toBe(37);
    expect(fahrenheitToCelsius(101.4)).toBe(38.6);
  });
});

describe('calculateNews2', () => {
  it('returns 0 / low risk for normal vitals', () => {
    const result = calculateNews2({ respiratoryRate: 16, spo2: 98, systolic: 138, heartRate: 76, temperature: 98.2 });
    expect(result.total).toBe(0);
    expect(result.risk).toBe('LOW');
    expect(result.complete).toBe(true);
    expect(getNews2Response(result).monitoring).toMatch(/12-hourly/);
  });

  it('flags a single red parameter as low-medium risk', () => {
    const result = calculateNews2({ respiratoryRate: 16, spo2: 98, systolic: 138, heartRate: 76, temperature: 98.2, consciousness: 'V' });
    expect(result.total).toBe(3);
    expect(result.hasRedScore).toBe(true);
    expect(result.risk).toBe('LOW_MEDIUM');
  });

  it('scores 5-6 as medium risk', () => {
    const result = calculateNews2({ respiratoryRate: 22, spo2: 93, systolic: 162, heartRate: 102, temperature: 99.1 });
    expect(result.total).toBe(5);
    expect(result.risk).toBe('MEDIUM');
  });

  it('adds 2 points for supplemental oxygen and escalates to high risk', () => {
    const result = calculateNews2({ respiratoryRate: 30, spo2: 88, systolic: 182, heartRate: 124, temperature: 101.4, onSupplementalO2: true });
    expect(result.total).toBe(11);
    expect(result.risk).toBe('HIGH');
    expect(getNews2Response(result).action).toMatch(/rapid response/i);
  });

  it('reports missing parameters as an incomplete score', () => {
    const result = calculateNews2({ respiratoryRate: 25, heartRate: 80 });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['spo2', 'systolic', 'temperature']);
    expect(result.total).toBe(3);
    expect(result.risk).toBe('LOW_MEDIUM');
  });

  it('does not report LOW risk when required parameters are missing', () => {
    const result = calculateNews2({ weight: 70 });
    expect(result.total).toBe(0);
    expect(result.risk).toBe('INCOMPLETE');
    expect(isNews2Actionable(result.risk)).toBe(false);
    const response = getNews2Response(result);
    expect(response.label).toBe('INCOMPLETE');
    expect(response.action).not.toMatch(/routine/i);
  });
});
