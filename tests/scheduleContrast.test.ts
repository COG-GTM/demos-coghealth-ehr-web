import fs from 'fs';
import path from 'path';
import {
  SCHEDULE_ROW_TONES,
  SELECTED_ROW_BADGE,
  ROW_ACTION_BUTTONS,
  getScheduleRowTone,
} from '../src/pages/scheduleRowStyles';

const AA_NORMAL_TEXT = 4.5;

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('WCAG contrast helper', () => {
  it('matches known reference ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe('Schedule row tones meet WCAG 1.4.3 AA', () => {
  for (const [name, tone] of Object.entries(SCHEDULE_ROW_TONES)) {
    for (const key of ['text', 'secondary', 'alert'] as const) {
      it(`${name} row ${key} text`, () => {
        expect(contrast(tone[key], tone.background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }

  it('selected-row badges', () => {
    expect(contrast(SELECTED_ROW_BADGE.color, SELECTED_ROW_BADGE.background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('urgent alerts use the ehr-alert-critical text colour', () => {
    expect(SCHEDULE_ROW_TONES.urgent.alert).toBe('#990000');
  });

  it('completed rows are not dimmed with opacity', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/SchedulePage.tsx'), 'utf8');
    expect(source).not.toMatch(/opacity-50/);
    expect(getScheduleRowTone({ isSelected: false, isUrgent: false, isFinished: true, isStriped: false }))
      .toBe(SCHEDULE_ROW_TONES.finished);
  });

  it('selection and urgency take precedence over status', () => {
    expect(getScheduleRowTone({ isSelected: true, isUrgent: true, isFinished: true, isStriped: true }))
      .toBe(SCHEDULE_ROW_TONES.selected);
    expect(getScheduleRowTone({ isSelected: false, isUrgent: true, isFinished: true, isStriped: true }))
      .toBe(SCHEDULE_ROW_TONES.urgent);
  });
});

describe('Row action buttons meet WCAG 1.4.3 AA', () => {
  for (const [name, b] of Object.entries(ROW_ACTION_BUTTONS)) {
    it(`${name} white text on both gradient stops`, () => {
      expect(contrast(b.text, b.top)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      expect(contrast(b.text, b.bottom)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }

  it('.ehr-button-primary (Check In / Join) gradients, including hover', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8');
    for (const selector of ['.ehr-button-primary', '.ehr-button-primary:hover']) {
      const escaped = selector.replace(/[.:]/g, (c) => `\\${c}`);
      const block = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
      expect(block).not.toBeNull();
      const stops = block![1].match(/#[0-9a-fA-F]{6}(?=\s+\d+%)/g) ?? [];
      expect(stops.length).toBe(2);
      for (const stop of stops) {
        expect(contrast('#ffffff', stop)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    }
  });
});
