import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertDialog, ConfirmDialog, Modal } from '../src/components/ui/Modal';

const noop = () => {};

function attr(html: string, selector: RegExp): string | undefined {
  return html.match(selector)?.[1];
}

describe('Modal accessibility', () => {
  test('renders a labelled modal dialog with an accessible close button', () => {
    const html = renderToStaticMarkup(
      createElement(Modal, { isOpen: true, onClose: noop, title: 'Print', children: 'body' }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('tabindex="-1"');
    const labelledBy = attr(html, /aria-labelledby="([^"]+)"/);
    expect(labelledBy).toBeTruthy();
    expect(html).toContain(`id="${labelledBy}" class="text-white font-semibold text-[11px]">Print</span>`);
    expect(html).toContain('aria-label="Close"');
  });

  test('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      createElement(Modal, { isOpen: false, onClose: noop, title: 'Print', children: 'body' }),
    );
    expect(html).toBe('');
  });
});

describe('Session timeout warning (ConfirmDialog)', () => {
  const message = 'Your session will expire in 2 minutes due to inactivity.';
  const html = renderToStaticMarkup(
    createElement(ConfirmDialog, {
      isOpen: true,
      onClose: noop,
      onConfirm: noop,
      onCancel: noop,
      title: 'Session Timeout Warning',
      message,
      confirmText: 'Continue Session',
      cancelText: 'Logout Now',
      type: 'warning',
    }),
  );

  test('is an alertdialog labelled by its title and described by its message', () => {
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    const labelledBy = attr(html, /aria-labelledby="([^"]+)"/);
    const describedBy = attr(html, /aria-describedby="([^"]+)"/);
    expect(html).toContain(`id="${labelledBy}" class="text-white font-semibold text-[11px]">Session Timeout Warning</span>`);
    expect(html).toContain(`<p id="${describedBy}" class="text-[11px] text-gray-700">${message}</p>`);
  });

  test('moves initial focus to the Continue Session button', () => {
    expect(html).toMatch(/<button type="button" data-autofocus="true"[^>]*>Continue Session<\/button>/);
    expect(html).not.toMatch(/<button[^>]*data-autofocus[^>]*>Logout Now<\/button>/);
  });

  test('danger confirmations focus the safe Cancel action instead', () => {
    const danger = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        isOpen: true, onClose: noop, onConfirm: noop, title: 'Delete', message: 'Delete?', type: 'danger',
      }),
    );
    expect(danger).toMatch(/<button[^>]*data-autofocus="true"[^>]*>Cancel<\/button>/);
    expect(danger).not.toMatch(/<button[^>]*data-autofocus[^>]*>OK<\/button>/);
  });
});

describe('Session expired notice (AlertDialog)', () => {
  test('is an alertdialog described by its message with OK focused', () => {
    const html = renderToStaticMarkup(
      createElement(AlertDialog, {
        isOpen: true, onClose: noop, title: 'Session Expired', message: 'Your session has expired.', type: 'warning',
      }),
    );
    expect(html).toContain('role="alertdialog"');
    const describedBy = attr(html, /aria-describedby="([^"]+)"/);
    expect(html).toContain(`<p id="${describedBy}" class="text-[11px]">Your session has expired.</p>`);
    expect(html).toMatch(/<button type="button" data-autofocus="true"[^>]*>OK<\/button>/);
  });
});
