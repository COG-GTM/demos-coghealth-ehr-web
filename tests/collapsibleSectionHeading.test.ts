import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CollapsibleSectionHeading from '../src/components/ui/CollapsibleSectionHeading';

const render = (expanded: boolean) =>
  renderToStaticMarkup(
    createElement(CollapsibleSectionHeading, {
      panelId: 'chart-allergies-panel',
      expanded,
      onToggle: () => {},
      children: 'Allergies (1)',
    })
  );

describe('CollapsibleSectionHeading', () => {
  test('renders the section title as an h2 wrapping a native button toggle', () => {
    const html = render(true);
    expect(html).toMatch(/^<h2[^>]*><button type="button"[^>]*>.*Allergies \(1\).*<\/button><\/h2>$/);
  });

  test('exposes expanded state and the controlled panel id', () => {
    expect(render(true)).toContain('aria-expanded="true"');
    expect(render(false)).toContain('aria-expanded="false"');
    expect(render(true)).toContain('aria-controls="chart-allergies-panel"');
  });

  test('hides decorative icons from assistive technology', () => {
    const svgs = render(true).match(/<svg[^>]*>/g) ?? [];
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => expect(svg).toContain('aria-hidden="true"'));
  });
});
