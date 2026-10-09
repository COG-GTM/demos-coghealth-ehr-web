import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DisclosureHeader } from '../src/components/ui/DisclosureHeader';

const render = (expanded: boolean) =>
  renderToStaticMarkup(
    createElement(DisclosureHeader, {
      label: 'Security Settings',
      expanded,
      controls: 'settings-section-security',
      onToggle: () => undefined,
    }),
  );

describe('DisclosureHeader', () => {
  it('renders a native button with disclosure semantics', () => {
    const html = render(true);
    expect(html).toMatch(/^<button type="button"/);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="settings-section-security"');
    expect(html).toContain('ehr-header');
    expect(html).toContain('Security Settings');
  });

  it('reflects collapsed state and hides the decorative +/- marker', () => {
    const html = render(false);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>\+<\/span>/);
  });
});
