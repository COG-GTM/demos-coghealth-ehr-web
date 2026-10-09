const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(root: ParentNode | null | undefined): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length > 0
  );
}

/**
 * Element that should receive focus when Tab / Shift+Tab is pressed inside a
 * modal, or null when the browser's default move stays inside the dialog.
 */
export function getTrapTarget<T>(focusables: readonly T[], active: T | null, shiftKey: boolean): T | null {
  if (focusables.length === 0) return null;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const index = active === null ? -1 : focusables.indexOf(active);
  if (shiftKey) return index <= 0 ? last : null;
  return index === -1 || active === last ? first : null;
}

const openDialogs: HTMLElement[] = [];

export function registerOpenDialog(dialog: HTMLElement): () => void {
  openDialogs.push(dialog);
  return () => {
    const index = openDialogs.lastIndexOf(dialog);
    if (index !== -1) openDialogs.splice(index, 1);
  };
}

export function isTopmostDialog(dialog: HTMLElement): boolean {
  return openDialogs[openDialogs.length - 1] === dialog;
}

/**
 * Makes every other child of <body> inert and hidden from assistive tech while
 * the modal (rendered as a direct child of <body>) is open. Returns a function
 * that undoes only the changes made by this call.
 */
export function hideBackground(modalRoot: HTMLElement): () => void {
  const changed: Array<{ el: HTMLElement; ariaHidden: string | null }> = [];
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement) || child === modalRoot || child.inert) continue;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
    changed.push({ el: child, ariaHidden: child.getAttribute('aria-hidden') });
    child.inert = true;
    child.setAttribute('aria-hidden', 'true');
  }
  return () => {
    for (const { el, ariaHidden } of changed) {
      el.inert = false;
      if (ariaHidden === null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', ariaHidden);
    }
  };
}
