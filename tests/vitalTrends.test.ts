import { assessTrend, classifyTrend, describeTrend, sparklineLabel } from '../src/utils/vitalTrends';

describe('vital trend text alternatives', () => {
  it('classifies direction using per-vital thresholds', () => {
    expect(classifyTrend('systolic', 138, 140)).toBe('stable');
    expect(classifyTrend('systolic', 138, 158)).toBe('up');
    expect(classifyTrend('temperature', 98.6, 98.4)).toBe('stable');
    expect(classifyTrend('temperature', 99.8, 98.6)).toBe('down');
    expect(classifyTrend('spo2', 94, 92)).toBe('down');
  });

  it('assesses whether a change is improving or worsening', () => {
    expect(assessTrend('systolic', 'up')).toBe('worsening');
    expect(assessTrend('painLevel', 'down')).toBe('improving');
    expect(assessTrend('spo2', 'up')).toBe('improving');
    expect(assessTrend('spo2', 'down')).toBe('worsening');
    expect(assessTrend('weight', 'up')).toBeNull();
    expect(assessTrend('systolic', 'stable')).toBeNull();
  });

  it('describes trends in words, not color', () => {
    expect(describeTrend('systolic', 'up')).toBe('rising, worsening');
    expect(describeTrend('heartRate', 'down')).toBe('falling, improving');
    expect(describeTrend('weight', 'up')).toBe('rising');
    expect(describeTrend('spo2', 'stable')).toBe('stable');
  });

  it('summarizes the sparkline oldest-to-newest from newest-first flowsheet data', () => {
    expect(sparklineLabel('BP Systolic', 'mmHg', 'systolic', [158, 162, 168, 172, 178, 182, 145, 138]))
      .toBe('BP Systolic trend over 8 readings: 138 to 158 mmHg, rising, worsening');
    expect(sparklineLabel('Temperature', '°F', 'temperature', [98.6, 98.2]))
      .toBe('Temperature trend over 2 readings: 98.2 to 98.6 °F, rising, worsening');
    expect(sparklineLabel('SpO2', '%', 'spo2', [94])).toBeNull();
  });
});
