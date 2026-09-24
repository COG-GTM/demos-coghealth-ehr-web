import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'coghealth_theme';

interface ThemeState {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

function readStoredPreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light';
  return preference;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

const initialPreference = readStoredPreference();
const initialResolved = resolveTheme(initialPreference);
applyTheme(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  resolved: initialResolved,
  setPreference: (preference) => {
    const resolved = resolveTheme(preference);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
    applyTheme(resolved);
    set({ preference, resolved });
  },
  toggle: () => {
    get().setPreference(get().resolved === 'dark' ? 'light' : 'dark');
  },
}));

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { preference } = useThemeStore.getState();
    if (preference !== 'system') return;
    const resolved = resolveTheme('system');
    applyTheme(resolved);
    useThemeStore.setState({ resolved });
  });
}
