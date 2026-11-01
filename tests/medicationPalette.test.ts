import {
  ACTION_BUTTON_TEXT,
  DISCONTINUE_GRADIENT,
  INACTIVE_ROW_BG,
  INACTIVE_ROW_TEXT,
  ROW_SECONDARY_TEXT,
  SELECTED_ROW_BG,
  SELECTED_ROW_SECONDARY_TEXT,
  SELECTED_ROW_TEXT,
  SIGN_GRADIENT,
  contrastRatio,
} from '../src/pages/medicationPalette';

const AA_NORMAL_TEXT = 4.5;

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#fff', '#fff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#767676')).toBeCloseTo(4.54, 2);
  });

  it('flags the previous Medications page colors as failing AA', () => {
    expect(contrastRatio('#ffffff', '#66cc66')).toBeLessThan(AA_NORMAL_TEXT);
    expect(contrastRatio('#ffffff', '#339933')).toBeLessThan(AA_NORMAL_TEXT);
    expect(contrastRatio('#ffffff', '#ff6666')).toBeLessThan(AA_NORMAL_TEXT);
    expect(contrastRatio('#cccccc', SELECTED_ROW_BG)).toBeLessThan(AA_NORMAL_TEXT);
  });
});

describe('Medications page palette meets WCAG 1.4.3 AA', () => {
  it.each([
    ['Sign button (top stop)', ACTION_BUTTON_TEXT, SIGN_GRADIENT[0]],
    ['Sign button (bottom stop)', ACTION_BUTTON_TEXT, SIGN_GRADIENT[1]],
    ['D/C button (top stop)', ACTION_BUTTON_TEXT, DISCONTINUE_GRADIENT[0]],
    ['D/C button (bottom stop)', ACTION_BUTTON_TEXT, DISCONTINUE_GRADIENT[1]],
    ['selected row text', SELECTED_ROW_TEXT, SELECTED_ROW_BG],
    ['selected row secondary text', SELECTED_ROW_SECONDARY_TEXT, SELECTED_ROW_BG],
    ['row secondary text on white', ROW_SECONDARY_TEXT, '#ffffff'],
    ['row secondary text on striped row', ROW_SECONDARY_TEXT, '#f9fafb'],
    ['row secondary text on inactive row', ROW_SECONDARY_TEXT, INACTIVE_ROW_BG],
    ['inactive row text', INACTIVE_ROW_TEXT, INACTIVE_ROW_BG],
  ])('%s', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
