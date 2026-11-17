import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CollapsiblePanelHeading, PanelHeading } from '../src/components/ui/PanelHeading';

const renderHeading = (expanded: boolean) =>
  renderToStaticMarkup(
    createElement(CollapsiblePanelHeading, {
      panelId: 'dashboard-panel-inbox',
      expanded,
      onToggle: () => undefined,
      children: createElement('span', null, 'Inbox'),
    }),
  );

describe('CollapsiblePanelHeading', () => {
  test('renders a heading containing a native toggle button', () => {
    const html = renderHeading(true);
    expect(html).toMatch(/^<h2 class="ehr-header ehr-header-collapsible[^"]*"><button type="button"/);
    expect(html).toContain('aria-controls="dashboard-panel-inbox"');
    expect(html).toContain('<span>Inbox</span></button></h2>');
  });

  test('exposes expanded and collapsed state', () => {
    expect(renderHeading(true)).toContain('aria-expanded="true"');
    expect(renderHeading(false)).toContain('aria-expanded="false"');
  });

  test('hides the +/- glyph from assistive technology', () => {
    expect(renderHeading(true)).toMatch(/<span class="[^"]*" aria-hidden="true">-<\/span>/);
    expect(renderHeading(false)).toMatch(/<span class="[^"]*" aria-hidden="true">\+<\/span>/);
  });
});

describe('PanelHeading', () => {
  test('renders static panel titles as h2 headings', () => {
    const html = renderToStaticMarkup(createElement(PanelHeading, { children: 'System Status' }));
    expect(html).toBe('<h2 class="ehr-header flex items-center ">System Status</h2>');
  });
});
