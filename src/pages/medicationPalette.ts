import type { CSSProperties } from 'react';

export const SELECTED_ROW_BG = '#316ac5';
export const SELECTED_ROW_TEXT = '#ffffff';
export const SELECTED_ROW_SECONDARY_TEXT = '#ffffff';
export const ROW_SECONDARY_TEXT = '#666666';

export const SIGN_GRADIENT = ['#2e7d32', '#1b5e20'] as const;
export const DISCONTINUE_GRADIENT = ['#c62828', '#8e0000'] as const;
export const ACTION_BUTTON_TEXT = '#ffffff';

export const INACTIVE_ROW_CLASS = 'bg-gray-100 text-gray-600';
export const INACTIVE_ROW_BG = '#f3f4f6';
export const INACTIVE_ROW_TEXT = '#4b5563';

export const SELECTED_BADGE_CLASS = 'border border-white';

export const signButtonStyle: CSSProperties = {
  background: `linear-gradient(to bottom, ${SIGN_GRADIENT[0]} 0%, ${SIGN_GRADIENT[1]} 100%)`,
  color: ACTION_BUTTON_TEXT,
  border: '1px solid #0d3b10',
};

export const discontinueButtonStyle: CSSProperties = {
  background: `linear-gradient(to bottom, ${DISCONTINUE_GRADIENT[0]} 0%, ${DISCONTINUE_GRADIENT[1]} 100%)`,
  color: ACTION_BUTTON_TEXT,
  border: '1px solid #5c0000',
};

export const selectedRowStyle: CSSProperties = { background: SELECTED_ROW_BG, color: SELECTED_ROW_TEXT };

export function secondaryTextStyle(selected: boolean): CSSProperties {
  return { color: selected ? SELECTED_ROW_SECONDARY_TEXT : ROW_SECONDARY_TEXT };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
