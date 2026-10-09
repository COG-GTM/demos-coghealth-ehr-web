import { assessTrend, describeSparkline, describeTrend } from '../src/pages/vitalsTrend';

describe('vitals trend text alternatives', () => {
  it('labels direction and clinical meaning', () => {
    expect(describeTrend('up', 'systolic')).toBe('rising (worsening)');
    expect(describeTrend('down', 'heartRate')).toBe('falling (improving)');
    expect(describeTrend('up', 'spo2')).toBe('rising (improving)');
    expect(describeTrend('down', 'spo2')).toBe('falling (worsening)');
    expect(describeTrend('up', 'weight')).toBe('rising');
    expect(describeTrend('stable', 'systolic')).toBe('stable');
  });

  it('classifies assessment independently of colour', () => {
    expect(assessTrend('up', 'painLevel')).toBe('worsening');
    expect(assessTrend('down', 'weight')).toBe('neutral');
    expect(assessTrend('stable', 'spo2')).toBe('neutral');
  });

  it('summarises a newest-first sparkline series', () => {
    expect(describeSparkline([158, 162, 138], { min: 90, max: 140 })).toBe('trend: rising, latest abnormal');
    expect(describeSparkline([94, 98], { min: 95, max: 100 })).toBe('trend: falling, latest abnormal');
    expect(describeSparkline([120, 120], { min: 90, max: 140 })).toBe('trend: flat, latest normal');
    expect(describeSparkline([120], { min: 90, max: 140 })).toBeNull();
  });
});
