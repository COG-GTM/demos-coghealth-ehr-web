import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderDialog } from '../src/components/ui/OrderDialog';

const render = (type: 'lab' | 'imaging') =>
  renderToStaticMarkup(
    createElement(OrderDialog, {
      isOpen: true,
      onClose: () => {},
      onSubmit: () => {},
      type,
      patientName: 'Test Patient',
      patientMrn: 'MRN000',
    })
  );

describe('OrderDialog keyboard and screen reader access', () => {
  test('renders every available lab test as a named, focusable button', () => {
    const html = render('lab');
    expect(html).toContain('<ul id="order-dialog-available-items" aria-label="Available tests"');
    expect(html).toContain('<button type="button" aria-label="Add CBC – Complete Blood Count with Differential" aria-disabled="false"');
    expect(html).toContain('aria-label="Add PSA – Prostate Specific Antigen"');
    expect(html).not.toMatch(/<div[^>]*cursor-pointer/);
  });

  test('renders imaging studies as named buttons', () => {
    const html = render('imaging');
    expect(html).toContain('aria-label="Available studies"');
    expect(html).toContain('aria-label="Add CXR – Chest X-Ray (PA &amp; Lateral)"');
  });

  test('provides a polite live region and a labelled search field', () => {
    const html = render('lab');
    expect(html).toContain('<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">');
    expect(html).toContain('aria-label="Search laboratory tests"');
    expect(html).toContain('aria-controls="order-dialog-available-items"');
  });

  test('hides decorative icons from assistive technology', () => {
    const html = render('lab');
    const svgs: string[] = html.match(/<svg[^>]*>/g) ?? [];
    const listSvgs = svgs.filter((tag) => tag.includes('lucide-plus') || tag.includes('lucide-search'));
    expect(listSvgs.length).toBeGreaterThan(0);
    listSvgs.forEach((tag) => expect(tag).toContain('aria-hidden="true"'));
  });
});
