import { assessVital, statusLabel, statusMarker } from '../src/utils/vitalStatus';

const spo2 = { normalRange: { min: 95, max: 100 }, criticalLow: 88 };
const systolic = { normalRange: { min: 90, max: 140 }, criticalLow: 80, criticalHigh: 180 };
const heartRate = { normalRange: { min: 60, max: 100 }, criticalLow: 40, criticalHigh: 150 };

describe('assessVital', () => {
  it('treats in-range, missing and unknown vitals as normal', () => {
    expect(assessVital(spo2, 98)).toEqual({ status: 'normal' });
    expect(assessVital(spo2, undefined)).toEqual({ status: 'normal' });
    expect(assessVital(undefined, 42)).toEqual({ status: 'normal' });
  });

  it('flags abnormal values with a direction', () => {
    expect(assessVital(spo2, 94)).toEqual({ status: 'abnormal', direction: 'low' });
    expect(assessVital(heartRate, 102)).toEqual({ status: 'abnormal', direction: 'high' });
  });

  it('flags critical values at the threshold', () => {
    expect(assessVital(spo2, 88)).toEqual({ status: 'critical', direction: 'low' });
    expect(assessVital(systolic, 182)).toEqual({ status: 'critical', direction: 'high' });
    expect(assessVital(systolic, 180)).toEqual({ status: 'critical', direction: 'high' });
  });
});

describe('status text', () => {
  it('gives every non-normal status a visible marker and a text label', () => {
    expect(statusMarker(assessVital(heartRate, 102))).toBe('H');
    expect(statusLabel(assessVital(heartRate, 102))).toBe('Abnormal high');
    expect(statusMarker(assessVital(spo2, 94))).toBe('L');
    expect(statusLabel(assessVital(spo2, 94))).toBe('Abnormal low');
    expect(statusMarker(assessVital(systolic, 182))).toBe('HH');
    expect(statusLabel(assessVital(systolic, 182))).toBe('Critical high');
    expect(statusMarker(assessVital(spo2, 88))).toBe('LL');
    expect(statusLabel(assessVital(spo2, 88))).toBe('Critical low');
  });

  it('adds no marker for normal values', () => {
    expect(statusMarker(assessVital(spo2, 98))).toBe('');
    expect(statusLabel(assessVital(spo2, 98))).toBe('');
  });
});
