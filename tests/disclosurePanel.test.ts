import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DisclosurePanel } from '../src/components/ui/DisclosurePanel';

const render = (expanded: boolean) =>
  renderToStaticMarkup(
    createElement(DisclosurePanel, {
      title: 'Recent Labs',
      expanded,
      onToggle: () => {},
      contentClassName: 'bg-white',
      children: createElement('span', null, 'HbA1c 7.2%'),
    }),
  );

describe('DisclosurePanel', () => {
  it('renders the header as a native button inside a heading', () => {
    const html = render(true);
    expect(html).toMatch(/<h3[^>]*><button type="button"[^>]*>.*Recent Labs<\/button><\/h3>/);
    expect(html).not.toMatch(/<div[^>]*onClick/i);
  });

  it('exposes expanded state and links the button to the region it controls', () => {
    const html = render(true);
    const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(html).toContain('aria-expanded="true"');
    expect(controls).toBeTruthy();
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain('HbA1c 7.2%');
    expect(html).not.toMatch(/ hidden=/);
  });

  it('keeps the controlled region in the DOM but hidden when collapsed', () => {
    const html = render(false);
    const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(new RegExp(`<div id="${controls}"[^>]* hidden=""`));
  });

  it('hides the +/- glyph from assistive technology', () => {
    expect(render(true)).toMatch(/<span aria-hidden="true"[^>]*>-<\/span>/);
    expect(render(false)).toMatch(/<span aria-hidden="true"[^>]*>\+<\/span>/);
  });
});
