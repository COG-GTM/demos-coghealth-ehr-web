import { readFileSync } from 'fs';
import { join } from 'path';
import { contrastRatio } from '../src/utils/contrast';
import {
  BANNER_GRADIENT_END,
  BANNER_GRADIENT_START,
  BANNER_TEXT,
} from '../src/components/patient/bannerColors';

const WCAG_AA_NORMAL_TEXT = 4.5;

describe('contrastRatio', () => {
  test('matches WCAG reference values', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  test('80% white over the old banner start fails AA (the reported defect)', () => {
    expect(contrastRatio('#ffffff', BANNER_GRADIENT_START, 0.8)).toBeLessThan(WCAG_AA_NORMAL_TEXT);
  });
});

describe('PatientBanner identification line', () => {
  test.each([BANNER_GRADIENT_START, BANNER_GRADIENT_END])(
    'banner text meets WCAG AA 4.5:1 on gradient stop %s',
    (stop) => {
      expect(contrastRatio(BANNER_TEXT, stop)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    },
  );

  test('banner text is not rendered with reduced opacity', () => {
    const source = readFileSync(
      join(__dirname, '../src/components/patient/PatientBanner.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/text-white\/\d+/);
  });
});
