import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintDialog } from '../src/components/ui/PrintDialog';

function render(): string {
  return renderToStaticMarkup(
    createElement(PrintDialog, {
      isOpen: true,
      onClose: () => {},
      title: 'Print',
      documentName: 'Patient List',
      onPrint: () => {},
    }),
  );
}

function controlIdForLabel(html: string, text: string): string {
  const match = html.match(new RegExp(`<label[^>]*for="([^"]+)"[^>]*>${text}</label>`));
  if (!match) throw new Error(`No <label for> found for "${text}"`);
  return match[1];
}

describe('PrintDialog label association', () => {
  it('associates the Copies label with the number input', () => {
    const html = render();
    const id = controlIdForLabel(html, 'Copies');
    expect(html).toMatch(new RegExp(`<input[^>]*id="${id}"[^>]*type="number"`));
  });

  it('associates the Orientation label with the select', () => {
    const html = render();
    const id = controlIdForLabel(html, 'Orientation');
    expect(html).toMatch(new RegExp(`<select[^>]*id="${id}"`));
  });

  it('gives each control a unique id', () => {
    const html = render();
    expect(controlIdForLabel(html, 'Copies')).not.toBe(controlIdForLabel(html, 'Orientation'));
  });
});
