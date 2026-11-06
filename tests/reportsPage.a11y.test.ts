import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportsPage from '../src/pages/ReportsPage';

describe('ReportsPage category headers', () => {
  const html = renderToStaticMarkup(createElement(ReportsPage));
  const headers = [...html.matchAll(/<h2[^>]*><button([^>]*)>/g)].map((m) => m[1]);

  it('renders each category toggle as a native button inside a heading', () => {
    expect(headers).toHaveLength(4);
    for (const attrs of headers) {
      expect(attrs).toContain('type="button"');
      expect(attrs).toContain('aria-expanded="true"');
    }
  });

  it('points aria-controls at a panel that contains the report table', () => {
    for (const attrs of headers) {
      const id = /aria-controls="([^"]+)"/.exec(attrs)?.[1];
      expect(id).toBeDefined();
      expect(html).toContain(`<div id="${id}"><table`);
    }
  });

  it('no longer uses a clickable div for the category header', () => {
    expect(html).not.toMatch(/<div[^>]*cursor-pointer/);
  });

  it('gives icon-only report actions an accessible name', () => {
    expect(html).toContain('aria-label="Download Daily Patient Census"');
    expect(html).toContain('aria-label="Run Daily Patient Census"');
  });
});
