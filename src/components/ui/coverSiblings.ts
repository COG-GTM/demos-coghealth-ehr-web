type Saved = { el: Element; inert: string | null; busy: string | null };

function cover(el: Element, saved: Saved[]) {
  saved.push({ el, inert: el.getAttribute('inert'), busy: el.getAttribute('aria-busy') });
  el.setAttribute('inert', '');
  el.setAttribute('aria-busy', 'true');
}

function restoreAttr(el: Element, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/**
 * Marks every child of `parent` except `keep` as inert and aria-busy, including
 * children added later, so content under a loading overlay can't be focused or
 * read. Returns a function that restores the previous attributes.
 */
export function coverSiblings(parent: Element, keep: ReadonlySet<Node>): () => void {
  const saved: Saved[] = [];
  const coverIfSibling = (node: Node) => {
    if (node.nodeType === 1 && !keep.has(node) && !saved.some((s) => s.el === node)) {
      cover(node as Element, saved);
    }
  };

  Array.from(parent.children).forEach(coverIfSibling);

  const observer =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver((records) => {
          records.forEach((r) => r.addedNodes.forEach(coverIfSibling));
        });
  observer?.observe(parent, { childList: true });

  return () => {
    observer?.disconnect();
    saved.forEach(({ el, inert, busy }) => {
      restoreAttr(el, 'inert', inert);
      restoreAttr(el, 'aria-busy', busy);
    });
  };
}
