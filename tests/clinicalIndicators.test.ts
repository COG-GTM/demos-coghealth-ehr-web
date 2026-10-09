import { copayStatusLabel, isSystolicHigh } from '../src/utils/clinicalIndicators';

describe('isSystolicHigh', () => {
  it('flags systolic readings above 140', () => {
    expect(isSystolicHigh('142/90')).toBe(true);
    expect(isSystolicHigh('180/110')).toBe(true);
  });

  it('does not flag readings at or below 140', () => {
    expect(isSystolicHigh('140/90')).toBe(false);
    expect(isSystolicHigh('138/88')).toBe(false);
  });

  it('does not flag unparseable readings', () => {
    expect(isSystolicHigh('')).toBe(false);
    expect(isSystolicHigh('--/--')).toBe(false);
  });
});

describe('copayStatusLabel', () => {
  it('returns a text label for each copay state', () => {
    expect(copayStatusLabel(true)).toBe('Collected');
    expect(copayStatusLabel(false)).toBe('Not collected');
    expect(copayStatusLabel(undefined)).toBe('Not collected');
  });
});
