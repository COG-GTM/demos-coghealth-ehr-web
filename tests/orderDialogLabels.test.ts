import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderDialog } from '../src/components/ui/OrderDialog';

function render(type: 'lab' | 'imaging') {
  return renderToStaticMarkup(
    createElement(OrderDialog, { isOpen: true, onClose: () => {}, type, onSubmit: () => {} })
  );
}

describe('OrderDialog accessible names', () => {
  it.each([
    ['lab', 'Search tests'],
    ['imaging', 'Search studies'],
  ] as const)('labels the %s search input', (type, name) => {
    expect(render(type)).toMatch(new RegExp(`<input[^>]*type="search"[^>]*aria-label="${name}"`));
  });

  it('labels the clinical notes textarea with its legend', () => {
    const html = render('lab');
    const legendId = html.match(/<legend id="([^"]+)">Clinical Notes \/ Indication<\/legend>/)?.[1];
    expect(legendId).toBeDefined();
    expect(html).toMatch(new RegExp(`<textarea[^>]*aria-labelledby="${legendId}"`));
  });
});
