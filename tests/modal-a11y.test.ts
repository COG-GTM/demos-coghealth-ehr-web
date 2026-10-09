import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertDialog, ConfirmDialog, Modal } from '../src/components/ui/Modal';
import { getTrapTarget, isTopmostDialog, registerOpenDialog } from '../src/components/ui/dialogFocus';

const noop = () => {};

function attr(html: string, selector: RegExp): string | undefined {
  return html.match(selector)?.[1];
}

describe('Modal dialog semantics', () => {
  test('renders nothing when closed', () => {
    const html = renderToStaticMarkup(createElement(Modal, { isOpen: false, onClose: noop, title: 'e-Prescribe', children: 'body' }));
    expect(html).toBe('');
  });

  test('exposes role, aria-modal and an accessible name from the title', () => {
    const html = renderToStaticMarkup(
      createElement(Modal, { isOpen: true, onClose: noop, title: 'e-Prescribe', children: 'body' })
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    const labelledBy = attr(html, /aria-labelledby="([^"]+)"/);
    expect(labelledBy).toBeTruthy();
    expect(html).toContain(`<span id="${labelledBy}" class="text-white font-semibold text-[11px]">e-Prescribe</span>`);
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain('tabindex="-1"');
  });

  test('AlertDialog is an alertdialog described by its message', () => {
    const html = renderToStaticMarkup(
      createElement(AlertDialog, { isOpen: true, onClose: noop, title: 'Saved', message: 'Prescription sent', type: 'success' })
    );
    expect(html).toContain('role="alertdialog"');
    const describedBy = attr(html, /aria-describedby="([^"]+)"/);
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`<p id="${describedBy}" class="text-[11px]">Prescription sent</p>`);
  });

  test('ConfirmDialog is an alertdialog described by its message', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        isOpen: true,
        onClose: noop,
        onConfirm: noop,
        title: 'Confirm Logout',
        message: 'Are you sure you want to log out?',
      })
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    const describedBy = attr(html, /aria-describedby="([^"]+)"/);
    expect(html).toContain(`<p id="${describedBy}" class="text-[11px] text-gray-700">Are you sure you want to log out?</p>`);
  });
});

describe('getTrapTarget', () => {
  const [a, b, c] = ['first', 'middle', 'last'];
  const items = [a, b, c];

  test('wraps Tab from the last element to the first', () => {
    expect(getTrapTarget(items, c, false)).toBe(a);
  });

  test('wraps Shift+Tab from the first element to the last', () => {
    expect(getTrapTarget(items, a, true)).toBe(c);
  });

  test('leaves moves between inner elements to the browser', () => {
    expect(getTrapTarget(items, a, false)).toBeNull();
    expect(getTrapTarget(items, b, true)).toBeNull();
  });

  test('pulls focus back in when it is outside the dialog or on the container', () => {
    expect(getTrapTarget(items, 'outside', false)).toBe(a);
    expect(getTrapTarget(items, 'outside', true)).toBe(c);
    expect(getTrapTarget(items, null, false)).toBe(a);
  });

  test('returns null when nothing is focusable', () => {
    expect(getTrapTarget([], null, false)).toBeNull();
  });
});

describe('open dialog stack', () => {
  test('only the most recently opened dialog handles keys', () => {
    const outer = {} as HTMLElement;
    const inner = {} as HTMLElement;
    const releaseOuter = registerOpenDialog(outer, outer);
    const releaseInner = registerOpenDialog(inner, inner);
    expect(isTopmostDialog(inner)).toBe(true);
    expect(isTopmostDialog(outer)).toBe(false);
    releaseInner();
    expect(isTopmostDialog(outer)).toBe(true);
    releaseOuter();
    expect(isTopmostDialog(outer)).toBe(false);
  });
});
