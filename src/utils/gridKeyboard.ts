export type GridKeyAction =
  | { type: 'focus'; index: number }
  | { type: 'select' }
  | { type: 'open' };

const PAGE_SIZE = 10;

export function getGridKeyAction(
  key: string,
  index: number,
  rowCount: number,
  isSelected: boolean,
): GridKeyAction | null {
  if (rowCount <= 0) return null;
  const last = rowCount - 1;
  switch (key) {
    case 'ArrowDown':
      return { type: 'focus', index: Math.min(index + 1, last) };
    case 'ArrowUp':
      return { type: 'focus', index: Math.max(index - 1, 0) };
    case 'PageDown':
      return { type: 'focus', index: Math.min(index + PAGE_SIZE, last) };
    case 'PageUp':
      return { type: 'focus', index: Math.max(index - PAGE_SIZE, 0) };
    case 'Home':
      return { type: 'focus', index: 0 };
    case 'End':
      return { type: 'focus', index: last };
    case ' ':
    case 'Spacebar':
      return { type: 'select' };
    case 'Enter':
      return isSelected ? { type: 'open' } : { type: 'select' };
    default:
      return null;
  }
}

export function clampRowIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  return Math.min(Math.max(index, 0), rowCount - 1);
}
