import { calculateNews2, fahrenheitToCelsius, news2Trend } from '../src/utils/news2';

describe('fahrenheitToCelsius', () => {
  it.each([
    [95, 35.0],
    [95.18, 35.1],
    [96.8, 36.0],
    [96.98, 36.1],
    [100.4, 38.0],
    [100.58, 38.1],
    [102.2, 39.0],
    [102.38, 39.1],
  ])('converts %p°F to %p°C', (fahrenheit, celsius) => {
    expect(fahrenheitToCelsius(fahrenheit)).toBeCloseTo(celsius, 10);
  });
});

describe('calculateNews2 RCP 2017 boundaries', () => {
  it.each([
    ['respiratoryRate', [8, 9, 11, 12, 20, 21, 24, 25], [3, 1, 1, 0, 0, 2, 2, 3]],
    ['spo2', [91, 92, 93, 94, 95, 96], [3, 2, 2, 1, 1, 0]],
    ['systolic', [90, 91, 100, 101, 110, 111, 219, 220], [3, 2, 2, 1, 1, 0, 0, 3]],
    ['heartRate', [40, 41, 50, 51, 90, 91, 110, 111, 130, 131], [3, 1, 1, 0, 0, 1, 1, 2, 2, 3]],
  ] as const)('%s boundary scores', (key, values, expectedScores) => {
    values.forEach((value, index) => {
      const result = calculateNews2({ [key]: value });
      const parameter = result.parameters.find((item) => item.key === key);
      expect(parameter?.score).toBe(expectedScores[index]);
      expect(parameter?.scored).toBe(true);
    });
  });

  it.each([
    [95, 35.0, 3],
    [95.18, 35.1, 1],
    [96.8, 36.0, 1],
    [96.98, 36.1, 0],
    [100.4, 38.0, 0],
    [100.58, 38.1, 1],
    [102.2, 39.0, 1],
    [102.38, 39.1, 2],
  ])('scores %p°F at the %p°C temperature boundary', (fahrenheit, celsius, expectedScore) => {
    expect(fahrenheitToCelsius(fahrenheit)).toBeCloseTo(celsius, 10);
    const parameter = calculateNews2({ temperature: fahrenheit }).parameters.find(item => item.key === 'temperature');
    expect(parameter?.score).toBe(expectedScore);
  });

  it('scores oxygen and CVPU observations', () => {
    const result = calculateNews2({ oxygenDelivery: 'oxygen', consciousness: 'CVPU' });
    expect(result.parameters.find(item => item.key === 'oxygenDelivery')).toMatchObject({ score: 2, scored: true });
    expect(result.parameters.find(item => item.key === 'consciousness')).toMatchObject({ score: 3, scored: true });
    expect(result.total).toBe(5);
  });

  it('resolves risk bands from total and single red scores', () => {
    expect(calculateNews2({}).riskBand).toBe('low');
    expect(calculateNews2({ respiratoryRate: 8 }).riskBand).toBe('low-medium');
    expect(calculateNews2({ respiratoryRate: 25, spo2: 92 }).riskBand).toBe('medium');
    expect(calculateNews2({ respiratoryRate: 25, spo2: 91 }).riskBand).toBe('medium');
    expect(calculateNews2({ respiratoryRate: 25, spo2: 93, systolic: 90 }).riskBand).toBe('high');
  });

  it('reports missing observations without inflating the total', () => {
    const result = calculateNews2({ respiratoryRate: 12 });
    expect(result.total).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.scoredParameterCount).toBe(3);
    expect(result.parameters.find(item => item.key === 'spo2')).toMatchObject({ score: 0, scored: false, display: null });
    expect(result.parameters.find(item => item.key === 'systolic')).toMatchObject({ score: 0, scored: false, display: null });
  });
});

describe('news2Trend', () => {
  it('reports rising, falling, stable, and unavailable trends', () => {
    expect(news2Trend(5, 3)).toEqual({ direction: 'rising', delta: 2 });
    expect(news2Trend(2, 5)).toEqual({ direction: 'falling', delta: -3 });
    expect(news2Trend(4, 4)).toEqual({ direction: 'stable', delta: 0 });
    expect(news2Trend(4, undefined)).toBeNull();
  });
});
