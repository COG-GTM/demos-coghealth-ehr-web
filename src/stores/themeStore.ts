import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const SETTINGS_STORAGE_KEY = 'coghealth_settings';

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return 'light';
    const parsed: unknown = JSON.parse(stored);
    if (parsed && typeof parsed === 'object' && 'appearance' in parsed) {
      const appearance = (parsed as { appearance?: { theme?: unknown } }).appearance;
      if (appearance && isTheme(appearance.theme)) return appearance.theme;
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
  }
  return 'light';
};

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;

const applyTheme = (theme: Theme) => {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
};

const persistTheme = (theme: Theme) => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const data: Record<string, unknown> = stored ? JSON.parse(stored) : {};
    const appearance =
      data.appearance && typeof data.appearance === 'object'
        ? (data.appearance as Record<string, unknown>)
        : {};
    data.appearance = { ...appearance, theme };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to persist theme:', e);
  }
};

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readStoredTheme(),
  resolvedTheme: resolveTheme(readStoredTheme()),
  setTheme: (theme) => {
    applyTheme(theme);
    persistTheme(theme);
    set({ theme, resolvedTheme: resolveTheme(theme) });
  },
  toggleTheme: () => {
    get().setTheme(get().resolvedTheme === 'dark' ? 'light' : 'dark');
  },
}));

export const initTheme = () => {
  const { theme } = useThemeStore.getState();
  applyTheme(theme);

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useThemeStore.getState().theme !== 'system') return;
    applyTheme('system');
    useThemeStore.setState({ resolvedTheme: resolveTheme('system') });
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
