import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference;
}

export function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      resolved: systemTheme(),
      setPreference: (preference) => {
        const resolved = resolveTheme(preference);
        applyTheme(resolved);
        set({ preference, resolved });
      },
      toggle: () => {
        get().setPreference(get().resolved === 'dark' ? 'light' : 'dark');
      },
    }),
    {
      name: 'coghealth_theme',
      partialize: (state) => ({ preference: state.preference }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setPreference(state.preference);
      },
    }
  )
);

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia(MEDIA_QUERY).addEventListener('change', () => {
    const { preference, setPreference } = useThemeStore.getState();
    if (preference === 'system') setPreference('system');
  });
}
