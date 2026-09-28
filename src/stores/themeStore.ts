import { createStore, useStore } from 'zustand';
import {
  DARK_MODE_QUERY,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemePreference,
  type ThemeRoot,
  type ThemeStorage,
} from '../theme/theme';

export interface ThemeMediaQuery {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
}

export interface ThemeEnvironment {
  storage?: ThemeStorage;
  root?: ThemeRoot;
  matchMedia?: (query: string) => ThemeMediaQuery;
}

export interface ThemeState {
  preference: ThemePreference;
  systemPrefersDark: boolean;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
  setSystemPrefersDark: (prefersDark: boolean) => void;
}

export function createThemeStore(env: ThemeEnvironment = {}) {
  const media = env.matchMedia?.(DARK_MODE_QUERY);
  const preference = readStoredTheme(env.storage);
  const systemPrefersDark = media?.matches ?? false;

  const store = createStore<ThemeState>()((set, get) => ({
    preference,
    systemPrefersDark,
    resolved: resolveTheme(preference, systemPrefersDark),
    setPreference: (next) => {
      writeStoredTheme(env.storage, next);
      set({ preference: next, resolved: resolveTheme(next, get().systemPrefersDark) });
    },
    toggle: () => {
      get().setPreference(get().resolved === 'dark' ? 'light' : 'dark');
    },
    setSystemPrefersDark: (prefersDark) => {
      set({ systemPrefersDark: prefersDark, resolved: resolveTheme(get().preference, prefersDark) });
    },
  }));

  applyTheme(env.root, store.getState().resolved);
  store.subscribe((state, prev) => {
    if (state.resolved !== prev.resolved) applyTheme(env.root, state.resolved);
  });
  media?.addEventListener('change', (event) => store.getState().setSystemPrefersDark(event.matches));

  return store;
}

function browserEnvironment(): ThemeEnvironment {
  if (typeof window === 'undefined') return {};
  let storage: ThemeStorage | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  return {
    storage,
    root: document.documentElement,
    matchMedia: typeof window.matchMedia === 'function' ? (query) => window.matchMedia(query) : undefined,
  };
}

export const themeStore = createThemeStore(browserEnvironment());

export function useTheme<T>(selector: (state: ThemeState) => T): T {
  return useStore(themeStore, selector);
}
