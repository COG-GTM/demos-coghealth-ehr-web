import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

function luminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

const css = read('src/index.css');

function cssVar(name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`${name} not defined in index.css`);
  return m[1];
}

function ruleBackground(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`${selector} not found in index.css`);
  const bg = m[2].match(/background:\s*([^;]+);/);
  if (!bg) throw new Error(`${selector} has no background`);
  const value = bg[1].trim();
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  return ref ? cssVar(ref[1]) : value;
}

const hexStops = (gradient: string) => gradient.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];

describe('white text on gradient surfaces meets WCAG 1.4.3 (4.5:1)', () => {
  const whiteTextSelectors = [
    '.ehr-header',
    '.ehr-button-primary',
    '.ehr-button-primary:hover',
    '.ehr-button-primary:active',
    '.ehr-button-danger',
    '.ehr-button-danger:hover',
    '.ehr-button-danger:active',
  ];

  it.each(whiteTextSelectors)('%s', (selector) => {
    const stops = hexStops(ruleBackground(selector));
    expect(stops.length).toBeGreaterThan(0);
    for (const stop of stops) {
      expect({ stop, ratio: contrastWithWhite(stop) >= 4.5 }).toEqual({ stop, ratio: true });
    }
  });

  it('modal title bar and danger buttons use the shared gradients instead of inline colours', () => {
    const modal = read('src/components/ui/Modal.tsx');
    const button = read('src/components/ui/Button.tsx');
    expect(modal).toContain("background: 'var(--ehr-header-gradient)'");
    expect(modal).toContain('ehr-button-danger');
    expect(button).toContain('ehr-button-danger');
    for (const source of [modal, button]) {
      expect(source).not.toMatch(/linear-gradient/);
    }
    // A translucent white hover overlay lightens the title bar below 4.5:1 behind the white close icon.
    expect(modal).not.toMatch(/hover:bg-white\//);
  });
});
