import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

const applyTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () =>
        set((state) => {
          const isDark = !state.isDark;
          applyTheme(isDark);
          return { isDark };
        }),
    }),
    {
      name: 'coghealth-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.isDark);
      },
    },
  ),
);
