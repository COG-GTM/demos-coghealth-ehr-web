import {
  calculateNews2,
  classifyNews2,
  fahrenheitToCelsius,
  scoreHeartRate,
  scoreRespiratoryRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemperatureCelsius,
} from '../src/utils/news2';

describe('NEWS2 parameter bands', () => {
  test.each([[8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3]])('respiratory rate %i -> %i', (v, p) => {
    expect(scoreRespiratoryRate(v)).toBe(p);
  });

  test.each([[91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0]])('SpO2 %i -> %i', (v, p) => {
    expect(scoreSpo2(v)).toBe(p);
  });

  test.each([[90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3]])('systolic %i -> %i', (v, p) => {
    expect(scoreSystolic(v)).toBe(p);
  });

  test.each([[40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1], [111, 2], [130, 2], [131, 3]])('pulse %i -> %i', (v, p) => {
    expect(scoreHeartRate(v)).toBe(p);
  });

  test.each([[35.0, 3], [35.1, 1], [36.0, 1], [36.1, 0], [38.0, 0], [38.1, 1], [39.0, 1], [39.1, 2]])('temperature %f C -> %i', (v, p) => {
    expect(scoreTemperatureCelsius(v)).toBe(p);
  });

  test('converts Fahrenheit to Celsius at 0.1 resolution', () => {
    expect(fahrenheitToCelsius(98.6)).toBe(37);
    expect(fahrenheitToCelsius(101.4)).toBe(38.6);
  });
});

describe('NEWS2 risk classification', () => {
  test.each([
    [0, false, 'none'],
    [3, false, 'low'],
    [3, true, 'low-medium'],
    [5, false, 'medium'],
    [6, true, 'medium'],
    [7, false, 'high'],
  ])('total %i (red=%s) -> %s', (total, red, risk) => {
    expect(classifyNews2(total, red)).toBe(risk);
  });
});

describe('calculateNews2', () => {
  test('scores a deteriorating patient as high risk', () => {
    const result = calculateNews2({ systolic: 182, heartRate: 124, temperature: 101.4, respiratoryRate: 30, spo2: 88 });
    expect(result.total).toBe(9);
    expect(result.risk).toBe('high');
    expect(result.missing).toEqual([]);
  });

  test('scores a stable patient as low risk', () => {
    const result = calculateNews2({ systolic: 138, heartRate: 76, temperature: 98.2, respiratoryRate: 16, spo2: 98 });
    expect(result.total).toBe(0);
    expect(result.risk).toBe('none');
  });

  test('adds points for supplemental oxygen and altered consciousness', () => {
    const result = calculateNews2({
      systolic: 138, heartRate: 76, temperature: 98.2, respiratoryRate: 16, spo2: 98,
      supplementalO2: true, consciousness: 'C',
    });
    expect(result.total).toBe(5);
    expect(result.risk).toBe('medium');
  });

  test('flags assumed and missing parameters', () => {
    const result = calculateNews2({ heartRate: 76 });
    expect(result.missing).toEqual(['respiratoryRate', 'spo2', 'systolic', 'temperature']);
    expect(result.components.filter(c => c.assumed).map(c => c.parameter)).toEqual(['supplementalO2', 'consciousness']);
  });
});
