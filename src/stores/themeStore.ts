import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'coghealth_theme';
const LEGACY_SETTINGS_KEY = 'coghealth_settings';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isTheme(stored)) return stored;
  try {
    const raw = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (raw) {
      const legacy = JSON.parse(raw) as { appearance?: { theme?: unknown } };
      if (isTheme(legacy.appearance?.theme)) return legacy.appearance.theme;
    }
  } catch {
    // ignore malformed legacy settings
  }
  return 'light';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const dark = resolveDark(theme);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  isDark: resolveDark(getStoredTheme()),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme, isDark: resolveDark(theme) });
  },
  toggle: () => {
    get().setTheme(get().isDark ? 'light' : 'dark');
  },
}));

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme(theme);
      useThemeStore.setState({ isDark: resolveDark(theme) });
    }
  });
}
