import { useCallback, useSyncExternalStore } from 'react';
import { createThemeStore, type ThemePreference, type ResolvedTheme } from './themeStore';

export const themeStore = createThemeStore({
  storage: window.localStorage,
  root: document.documentElement,
  systemQuery: window.matchMedia('(prefers-color-scheme: dark)'),
});

export interface UseThemeResult {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  isDark: boolean;
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
  const preference = useSyncExternalStore(themeStore.subscribe, themeStore.getPreference);
  const resolved = useSyncExternalStore(themeStore.subscribe, themeStore.getResolved);
  const setTheme = useCallback((next: ThemePreference) => themeStore.setPreference(next), []);
  const toggleTheme = useCallback(() => themeStore.toggle(), []);
  return { preference, resolved, isDark: resolved === 'dark', setTheme, toggleTheme };
}
