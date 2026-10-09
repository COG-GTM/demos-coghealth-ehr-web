import { clampRowIndex, getGridKeyAction } from '../src/utils/gridKeyboard';

describe('getGridKeyAction', () => {
  it('moves focus with arrow keys and clamps at the edges', () => {
    expect(getGridKeyAction('ArrowDown', 0, 3, false)).toEqual({ type: 'focus', index: 1 });
    expect(getGridKeyAction('ArrowDown', 2, 3, false)).toEqual({ type: 'focus', index: 2 });
    expect(getGridKeyAction('ArrowUp', 1, 3, false)).toEqual({ type: 'focus', index: 0 });
    expect(getGridKeyAction('ArrowUp', 0, 3, false)).toEqual({ type: 'focus', index: 0 });
  });

  it('jumps with Home/End and PageUp/PageDown', () => {
    expect(getGridKeyAction('Home', 7, 20, false)).toEqual({ type: 'focus', index: 0 });
    expect(getGridKeyAction('End', 0, 20, false)).toEqual({ type: 'focus', index: 19 });
    expect(getGridKeyAction('PageDown', 15, 20, false)).toEqual({ type: 'focus', index: 19 });
    expect(getGridKeyAction('PageUp', 4, 20, false)).toEqual({ type: 'focus', index: 0 });
  });

  it('selects with Space regardless of selection state', () => {
    expect(getGridKeyAction(' ', 0, 3, false)).toEqual({ type: 'select' });
    expect(getGridKeyAction(' ', 0, 3, true)).toEqual({ type: 'select' });
  });

  it('selects an unselected row on Enter and opens the chart of a selected row', () => {
    expect(getGridKeyAction('Enter', 1, 3, false)).toEqual({ type: 'select' });
    expect(getGridKeyAction('Enter', 1, 3, true)).toEqual({ type: 'open' });
  });

  it('ignores other keys and empty grids', () => {
    expect(getGridKeyAction('a', 0, 3, false)).toBeNull();
    expect(getGridKeyAction('Tab', 0, 3, false)).toBeNull();
    expect(getGridKeyAction('ArrowDown', 0, 0, false)).toBeNull();
  });
});

describe('clampRowIndex', () => {
  it('keeps the active row inside the current result set', () => {
    expect(clampRowIndex(5, 3)).toBe(2);
    expect(clampRowIndex(-1, 3)).toBe(0);
    expect(clampRowIndex(1, 3)).toBe(1);
    expect(clampRowIndex(4, 0)).toBe(0);
  });
});
