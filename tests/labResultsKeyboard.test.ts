import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LabResultsPage from '../src/pages/LabResultsPage';

const markup = renderToStaticMarkup(createElement(LabResultsPage));

describe('LabResultsPage keyboard access', () => {
  it('renders every panel header as a button exposing expanded state', () => {
    const headers = [...markup.matchAll(/<button[^>]*id="lab-panel-(\d+)-header"[^>]*>/g)];
    expect(headers.length).toBeGreaterThanOrEqual(5);
    for (const [tag, id] of headers) {
      expect(tag).toContain('type="button"');
      expect(tag).toMatch(/aria-expanded="(true|false)"/);
      expect(tag).toContain(`aria-controls="lab-panel-${id}-results"`);
      expect(markup).toContain(`id="lab-panel-${id}-results"`);
    }
  });

  it('marks collapsed panels as not expanded and hides their region', () => {
    expect(markup).toMatch(/id="lab-panel-2-header"[^>]*aria-expanded="false"/);
    expect(markup).toMatch(/<div id="lab-panel-2-results"[^>]*hidden=""/);
    expect(markup).toMatch(/id="lab-panel-1-header"[^>]*aria-expanded="true"/);
  });

  it('gives each visible result row a focusable button that opens the detail dialog', () => {
    const rows = markup.match(/<tr [^>]*class="cursor-pointer/g) ?? [];
    const rowButtons = markup.match(/<button[^>]*aria-haspopup="dialog"[^>]*>/g) ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rowButtons.length).toBe(rows.length);
    expect(markup).toContain('aria-label="Potassium: 6.8 mEq/L, critical. View result details"');
  });

  it('does not nest block-level elements inside panel header buttons', () => {
    const headerBodies = [...markup.matchAll(/<button[^>]*id="lab-panel-\d+-header"[^>]*>([\s\S]*?)<\/button>/g)];
    for (const [, body] of headerBodies) {
      expect(body).not.toMatch(/<div[\s>]/);
    }
  });
});
