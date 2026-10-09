import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '../src/pages/SettingsPage.tsx'), 'utf8');

describe('SettingsPage form labels', () => {
  it('associates every stacked field label with a control via htmlFor/id', () => {
    const labels = [...source.matchAll(/<label([^>]*)className="block text-\[10px\] text-gray-600 mb-0\.5">([^<]+)<\/label>/g)];
    expect(labels.length).toBeGreaterThanOrEqual(12);
    for (const [, attrs, text] of labels) {
      const htmlFor = attrs.match(/htmlFor="([^"]+)"/)?.[1];
      expect({ label: text, htmlFor }).toEqual({ label: text, htmlFor: expect.any(String) });
      const ids = source.match(new RegExp(`\\bid="${htmlFor}"`, 'g')) ?? [];
      expect({ label: text, controls: ids.length }).toEqual({ label: text, controls: 1 });
    }
  });

  it('gives each business hours select a day-specific accessible name', () => {
    expect(source).toContain('aria-label={`${day} opening time`}');
    expect(source).toContain('aria-label={`${day} closing time`}');
  });
});
