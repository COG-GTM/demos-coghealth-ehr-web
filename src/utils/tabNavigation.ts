export function nextTabIndex(currentIndex: number, key: string, tabCount: number): number | null {
  if (tabCount <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % tabCount;
    case 'ArrowLeft':
      return (currentIndex - 1 + tabCount) % tabCount;
    case 'Home':
      return 0;
    case 'End':
      return tabCount - 1;
    default:
      return null;
  }
}

export const chartTabId = (tabId: string) => `chart-tab-${tabId}`;
export const CHART_TABPANEL_ID = 'chart-tabpanel';
