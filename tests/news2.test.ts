import {
  bandForScore,
  calculateNews2,
  fahrenheitToCelsius,
  news2Trend,
  scoreHeartRate,
  scoreRespiratoryRate,
  scoreSpo2,
  scoreSystolic,
  scoreTemperatureCelsius,
} from '../src/utils/news2';

describe('NEWS2 parameter scorers', () => {
  test.each([
    [8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3],
  ])('scores respiratory rate %i as %i', (value, expected) => {
    expect(scoreRespiratoryRate(value)).toBe(expected);
  });

  test.each([[91, 3], [93, 2], [95, 1], [96, 0]])('scores SpO2 %i as %i', (value, expected) => {
    expect(scoreSpo2(value)).toBe(expected);
  });

  test.each([
    [90, 3], [100, 2], [110, 1], [111, 0], [219, 0], [220, 3],
  ])('scores systolic %i as %i', (value, expected) => {
    expect(scoreSystolic(value)).toBe(expected);
  });

  test.each([
    [40, 3], [50, 1], [90, 0], [110, 1], [130, 2], [131, 3],
  ])('scores heart rate %i as %i', (value, expected) => {
    expect(scoreHeartRate(value)).toBe(expected);
  });

  test.each([
    [35.0, 3], [35.1, 1], [36.1, 0], [38.1, 1], [39.1, 2],
  ])('scores temperature %s°C as %i', (value, expected) => {
    expect(scoreTemperatureCelsius(value)).toBe(expected);
  });
});

describe('NEWS2 calculation', () => {
  test('converts Fahrenheit to Celsius and formats temperature', () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 5);
    const result = calculateNews2({ temperature: 95 });
    expect(result.parameters.find(parameter => parameter.key === 'temperature')).toMatchObject({
      display: '35.0 °C',
      score: 3,
    });
  });

  test('selects the single-parameter-3 low-medium band', () => {
    const result = calculateNews2({ respiratoryRate: 8 });
    expect(result.total).toBe(3);
    expect(result.band).toBe('low-medium');
  });

  test('selects medium at total 5 or more and high at total 7 or more', () => {
    expect(bandForScore(5, false)).toBe('medium');
    expect(bandForScore(7, false)).toBe('high');
  });

  test('adds oxygen and CVPU contributions', () => {
    const result = calculateNews2(
      { respiratoryRate: 12 },
      { consciousness: 'CVPU', onSupplementalOxygen: true },
    );
    expect(result.total).toBe(5);
    expect(result.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'supplementalOxygen', score: 2, display: 'Oxygen' }),
      expect.objectContaining({ key: 'consciousness', score: 3, display: 'CVPU' }),
    ]));
    expect(result.band).toBe('medium');
  });

  test('scores undefined values as zero and lists missing parameters', () => {
    const result = calculateNews2({});
    expect(result.total).toBe(0);
    expect(result.parameters.filter(parameter => parameter.missing)).toHaveLength(5);
    expect(result.missingParameters).toEqual([
      'Respiration rate',
      'SpO2 (scale 1)',
      'Systolic BP',
      'Pulse',
      'Temperature',
    ]);
  });
});

describe('NEWS2 trends', () => {
  test.each([
    [[5, 3], 'rising', 2],
    [[3, 5], 'falling', -2],
    [[4, 4], 'stable', 0],
    [[4], 'stable', 0],
  ])('calculates %s trend', (scores, expectedTrend, expectedDelta) => {
    expect(news2Trend(scores)).toEqual({ trend: expectedTrend, delta: expectedDelta });
  });
});
