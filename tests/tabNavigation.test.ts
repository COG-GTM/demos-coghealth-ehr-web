import { nextTabIndex, chartTabId, CHART_TABPANEL_ID } from '../src/utils/tabNavigation';

describe('nextTabIndex', () => {
  it('moves right and wraps to the first tab', () => {
    expect(nextTabIndex(0, 'ArrowRight', 6)).toBe(1);
    expect(nextTabIndex(5, 'ArrowRight', 6)).toBe(0);
  });

  it('moves left and wraps to the last tab', () => {
    expect(nextTabIndex(3, 'ArrowLeft', 6)).toBe(2);
    expect(nextTabIndex(0, 'ArrowLeft', 6)).toBe(5);
  });

  it('jumps to the first and last tab with Home/End', () => {
    expect(nextTabIndex(3, 'Home', 6)).toBe(0);
    expect(nextTabIndex(3, 'End', 6)).toBe(5);
  });

  it('ignores other keys and empty tab lists', () => {
    expect(nextTabIndex(2, 'Enter', 6)).toBeNull();
    expect(nextTabIndex(2, 'ArrowDown', 6)).toBeNull();
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull();
  });
});

describe('chart tab ids', () => {
  it('derives stable tab ids distinct from the panel id', () => {
    expect(chartTabId('summary')).toBe('chart-tab-summary');
    expect(chartTabId('results')).not.toBe(CHART_TABPANEL_ID);
  });
});
