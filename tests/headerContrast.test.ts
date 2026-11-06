import { readFileSync } from 'fs';
import { join } from 'path';

// Tailwind v4 palette values (sRGB) for the colours used on the app header.
const PALETTE: Record<string, string> = {
  white: '#ffffff',
  'blue-100': '#dbeafe',
  'yellow-200': '#fff085',
};

const read = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8');

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const headerGradientStops = () => {
  const rule = read('src/index.css').match(/\.ehr-header\s*{[^}]*}/);
  if (!rule) throw new Error('.ehr-header rule not found');
  const stops = rule[0].match(/#[0-9a-fA-F]{6}/g) ?? [];
  expect(stops.length).toBeGreaterThanOrEqual(2);
  return stops;
};

const appHeaderMarkup = () => {
  const app = read('src/App.tsx');
  const start = app.indexOf('{/* Application Header */}');
  const end = app.indexOf('{/* Navigation Toolbar */}');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return app.slice(start, end);
};

describe('application header contrast (WCAG 1.4.3 AA)', () => {
  it.each(Object.entries(PALETTE))('%s text reaches 4.5:1 on every .ehr-header gradient stop', (_, fg) => {
    for (const stop of headerGradientStops()) {
      expect(contrast(fg, stop)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not use the light colours that fail on the gradient', () => {
    const visibleText = appHeaderMarkup().replace(/<span[^>]*aria-hidden="true"[^>]*>\|<\/span>/g, '');
    expect(visibleText).not.toMatch(/\b(?:text|placeholder)-(?:blue-[234]00|yellow-[34]00)\b/);
  });

  it('keeps the session warning legible', () => {
    expect(appHeaderMarkup()).toMatch(/SESSION_WARNING_MS \? 'text-yellow-200' : 'text-white'/);
  });
});
