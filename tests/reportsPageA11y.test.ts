import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportsPage from '../src/pages/ReportsPage';

const buttonsIn = (html: string) => html.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
const visibleText = (button: string) => button.replace(/<[^>]+>/g, '').trim();

describe('ReportsPage report row actions', () => {
  const html = renderToStaticMarkup(createElement(ReportsPage));
  const buttons = buttonsIn(html);
  const downloads = buttons.filter((b) => (attr(b, 'aria-label') ?? '').startsWith('Download '));
  const runs = buttons.filter((b) => (attr(b, 'aria-label') ?? '').startsWith('Run '));

  it('gives every Download button a unique, report-specific accessible name and tooltip', () => {
    expect(downloads).toHaveLength(8);
    const names = downloads.map((b) => attr(b, 'aria-label'));
    expect(new Set(names).size).toBe(downloads.length);
    expect(names).toContain('Download Daily Patient Census as PDF');
    downloads.forEach((b) => expect(attr(b, 'title')).toBe(attr(b, 'aria-label')));
  });

  it('gives every Run button a unique name that contains its visible label', () => {
    expect(runs).toHaveLength(8);
    expect(new Set(runs.map((b) => attr(b, 'aria-label'))).size).toBe(runs.length);
    runs.forEach((b) => expect(attr(b, 'aria-label')).toMatch(new RegExp(`^${visibleText(b)} `)));
  });

  it('hides decorative row-action icons from assistive technology', () => {
    [...downloads, ...runs].forEach((b) => {
      const svg = b.match(/<svg[^>]*>/)?.[0] ?? '';
      expect(attr(svg, 'aria-hidden')).toBe('true');
    });
  });

  it('leaves no icon-only button without an accessible name', () => {
    const unnamed = buttons.filter((b) => !visibleText(b) && !attr(b, 'aria-label') && !attr(b, 'title'));
    expect(unnamed).toEqual([]);
  });
});
