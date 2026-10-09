import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrescriptionDialog } from '../src/components/ui/PrescriptionDialog';
import { nextListboxIndex } from '../src/utils/listboxNavigation';

describe('nextListboxIndex', () => {
  it('moves down and up within bounds', () => {
    expect(nextListboxIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextListboxIndex('ArrowDown', 2, 3)).toBe(2);
    expect(nextListboxIndex('ArrowUp', 1, 3)).toBe(0);
    expect(nextListboxIndex('ArrowUp', 0, 3)).toBe(0);
  });

  it('jumps to first and last with Home/End', () => {
    expect(nextListboxIndex('Home', 2, 5)).toBe(0);
    expect(nextListboxIndex('End', 0, 5)).toBe(4);
  });

  it('ignores other keys and empty lists', () => {
    expect(nextListboxIndex('a', 0, 3)).toBeNull();
    expect(nextListboxIndex('ArrowDown', 0, 0)).toBeNull();
  });
});

describe('PrescriptionDialog medication list', () => {
  const html = renderToStaticMarkup(
    createElement(PrescriptionDialog, { isOpen: true, onClose: () => {}, onSubmit: () => {} })
  );

  it('exposes the list as a labelled listbox', () => {
    expect(html).toMatch(/role="listbox"[^>]*aria-labelledby="[^"]+"/);
    expect(html).toContain('aria-label="Search medications"');
  });

  it('renders every medication as a keyboard-reachable option with selection state', () => {
    const options: string[] = html.match(/<div[^>]*role="option"[^>]*>/g) ?? [];
    expect(options.length).toBe(15);
    options.forEach(option => expect(option).toContain('aria-selected="false"'));
    const tabbable = options.filter(option => option.includes('tabindex="0"'));
    expect(tabbable.length).toBe(1);
    expect(options.filter(option => option.includes('tabindex="-1"')).length).toBe(14);
  });
});
