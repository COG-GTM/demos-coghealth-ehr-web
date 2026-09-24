import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'coghealth_theme';

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;
}

function applyMode(mode: ThemeMode): 'light' | 'dark' {
  const resolved = resolveMode(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  return resolved;
}

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const initialMode = readStoredMode();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolved: applyMode(initialMode),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    set({ mode, resolved: applyMode(mode) });
  },
  toggle: () => {
    get().setMode(get().resolved === 'dark' ? 'light' : 'dark');
  },
}));

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { mode } = useThemeStore.getState();
  if (mode === 'system') {
    useThemeStore.setState({ resolved: applyMode('system') });
  }
});
