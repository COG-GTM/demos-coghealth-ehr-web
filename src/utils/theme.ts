export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'coghealth_settings';
const prefersDark = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function getStoredTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const theme = data?.appearance?.theme;
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        return theme;
      }
    }
  } catch {
    // ignore malformed storage
  }
  return 'light';
}

export function applyTheme(choice: ThemeChoice) {
  const isDark = choice === 'dark' || (choice === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', isDark);
}

export function initTheme() {
  applyTheme(getStoredTheme());
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  });
}
