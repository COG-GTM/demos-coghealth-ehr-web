import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const SETTINGS_KEY = 'coghealth_settings';
const THEME_EVENT = 'coghealth-theme-change';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return 'light';
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'appearance' in parsed) {
      const appearance = (parsed as { appearance?: { theme?: unknown } }).appearance;
      if (appearance && isTheme(appearance.theme)) return appearance.theme;
    }
  } catch {
    return 'light';
  }
  return 'light';
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
}

function storeTheme(theme: Theme): void {
  let settings: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') settings = parsed as Record<string, unknown>;
    }
  } catch {
    settings = {};
  }
  const appearance = (settings.appearance ?? {}) as Record<string, unknown>;
  settings.appearance = { ...appearance, theme };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function setTheme(theme: Theme): void {
  storeTheme(theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const next = (event as CustomEvent<Theme>).detail;
      if (isTheme(next)) setThemeState(next);
    };
    window.addEventListener(THEME_EVENT, handleChange);
    return () => window.removeEventListener(THEME_EVENT, handleChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, systemDark]);

  const update = useCallback((next: Theme) => {
    setTheme(next);
    setThemeState(next);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  return { theme, resolvedTheme, setTheme: update };
}
