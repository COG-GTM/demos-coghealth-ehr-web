import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoadingOverlay } from '../src/components/ui/LoadingOverlay';
import { coverSiblings } from '../src/components/ui/coverSiblings';

class FakeElement {
  nodeType = 1;
  children: FakeElement[] = [];
  private attrs = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    Object.entries(init).forEach(([k, v]) => this.attrs.set(k, v));
  }
  getAttribute(name: string) {
    return this.attrs.has(name) ? (this.attrs.get(name) as string) : null;
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  removeAttribute(name: string) {
    this.attrs.delete(name);
  }
}

describe('LoadingOverlay', () => {
  it('mounts an empty polite status region and hides decoration', () => {
    const html = renderToStaticMarkup(
      createElement(LoadingOverlay, { isLoading: true, text: 'Loading patients...' })
    );
    expect(html).toMatch(
      /^<span role="status" aria-live="polite" aria-atomic="true" class="sr-only"><\/span>/
    );
    expect(html).toContain('<svg aria-hidden="true" focusable="false"');
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>Loading patients\.\.\.<\/span>/);
  });

  it('keeps an empty status region mounted when not loading', () => {
    const html = renderToStaticMarkup(createElement(LoadingOverlay, { isLoading: false }));
    expect(html).toBe(
      '<span role="status" aria-live="polite" aria-atomic="true" class="sr-only"></span>'
    );
  });
});

describe('coverSiblings', () => {
  it('makes covered siblings inert and busy, then restores prior attributes', () => {
    const status = new FakeElement();
    const overlay = new FakeElement();
    const toolbar = new FakeElement();
    const grid = new FakeElement({ 'aria-busy': 'false' });
    const alreadyInert = new FakeElement({ inert: '' });
    const parent = new FakeElement();
    parent.children = [status, overlay, toolbar, grid, alreadyInert];

    const restore = coverSiblings(
      parent as unknown as Element,
      new Set([status, overlay] as unknown as Node[])
    );

    [toolbar, grid, alreadyInert].forEach((el) => {
      expect(el.getAttribute('inert')).toBe('');
      expect(el.getAttribute('aria-busy')).toBe('true');
    });
    [status, overlay].forEach((el) => {
      expect(el.getAttribute('inert')).toBeNull();
      expect(el.getAttribute('aria-busy')).toBeNull();
    });

    restore();

    expect(toolbar.getAttribute('inert')).toBeNull();
    expect(toolbar.getAttribute('aria-busy')).toBeNull();
    expect(grid.getAttribute('inert')).toBeNull();
    expect(grid.getAttribute('aria-busy')).toBe('false');
    expect(alreadyInert.getAttribute('inert')).toBe('');
    expect(alreadyInert.getAttribute('aria-busy')).toBeNull();
  });
});
