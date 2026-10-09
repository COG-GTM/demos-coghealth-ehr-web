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

interface OpenDialog {
  dialog: HTMLElement;
  root: HTMLElement;
}

const openDialogs: OpenDialog[] = [];
const hiddenByUs = new Map<HTMLElement, string | null>();

/**
 * Makes every child of <body> except the topmost dialog's root inert and
 * hidden from assistive tech, and restores elements that no longer need it.
 * Recomputed from the whole stack so the result does not depend on the order
 * in which dialogs open or close.
 */
function syncBackground(): void {
  if (typeof document === 'undefined') return;
  const topRoot = openDialogs[openDialogs.length - 1]?.root;
  const shouldHide = new Set<HTMLElement>();
  if (topRoot) {
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === topRoot) continue;
      if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
      if (child.inert && !hiddenByUs.has(child)) continue;
      shouldHide.add(child);
    }
  }
  for (const [el, ariaHidden] of hiddenByUs) {
    if (shouldHide.has(el)) continue;
    el.inert = false;
    if (ariaHidden === null) el.removeAttribute('aria-hidden');
    else el.setAttribute('aria-hidden', ariaHidden);
    hiddenByUs.delete(el);
  }
  for (const el of shouldHide) {
    if (hiddenByUs.has(el)) continue;
    hiddenByUs.set(el, el.getAttribute('aria-hidden'));
    el.inert = true;
    el.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Registers an open modal. `root` is its direct child of <body> (the portal
 * overlay); everything else under <body> is made inert until it is released.
 */
export function registerOpenDialog(dialog: HTMLElement, root: HTMLElement): () => void {
  const entry = { dialog, root };
  openDialogs.push(entry);
  syncBackground();
  return () => {
    const index = openDialogs.lastIndexOf(entry);
    if (index !== -1) openDialogs.splice(index, 1);
    syncBackground();
  };
}

export function isTopmostDialog(dialog: HTMLElement): boolean {
  return openDialogs[openDialogs.length - 1]?.dialog === dialog;
}
