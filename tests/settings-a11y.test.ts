import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SettingsPage from '../src/pages/SettingsPage';

describe('SettingsPage accessibility state', () => {
  beforeAll(() => {
    const store: Record<string, string> = {};
    (globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
    };
  });

  const html = () => renderToStaticMarkup(createElement(SettingsPage));

  it('marks only the active settings section with aria-current', () => {
    const markup = html();
    expect(markup).toContain('<nav aria-label="Settings sections"');
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toMatch(/aria-current="page"[^>]*>(<svg[^]*?<\/svg>)?Profile<\/button>/);
  });

  it('renders a persistent polite status region for the save confirmation', () => {
    expect(html()).toMatch(/<div role="status" aria-live="polite" aria-atomic="true" class="sr-only"><\/div>/);
  });
});
