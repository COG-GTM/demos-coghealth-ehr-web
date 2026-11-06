import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertDialog, ConfirmDialog, Modal } from '../src/components/ui/Modal';

const noop = () => {};

function closeButton(markup: string): string {
  const match = markup.match(/<button[^>]*>(?:(?!<\/button>).)*<svg[^>]*lucide-x[\s\S]*?<\/button>/);
  if (!match) throw new Error('close button not rendered');
  return match[0];
}

describe('Modal close button', () => {
  it('has an accessible name that includes the dialog title', () => {
    const markup = renderToStaticMarkup(
      createElement(Modal, { isOpen: true, onClose: noop, title: 'New Order', children: 'body' }),
    );
    const button = closeButton(markup);
    expect(button).toContain('aria-label="Close New Order"');
    expect(button).toContain('type="button"');
    expect(button).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('is named in ConfirmDialog and AlertDialog', () => {
    const confirm = renderToStaticMarkup(
      createElement(ConfirmDialog, { isOpen: true, onClose: noop, onConfirm: noop, title: 'Sign Note', message: 'Sign?' }),
    );
    const alert = renderToStaticMarkup(
      createElement(AlertDialog, { isOpen: true, onClose: noop, title: 'Saved', message: 'Done' }),
    );
    expect(closeButton(confirm)).toContain('aria-label="Close Sign Note"');
    expect(closeButton(alert)).toContain('aria-label="Close Saved"');
  });
});
