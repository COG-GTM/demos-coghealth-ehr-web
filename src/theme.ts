export type ThemePreference = 'light' | 'dark' | 'system';

export const SETTINGS_KEY = 'coghealth_settings';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(storage: Pick<Storage, 'getItem'>): ThemePreference {
  try {
    const stored = storage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings: unknown = JSON.parse(stored);
      if (typeof settings === 'object' && settings !== null && 'appearance' in settings) {
        const { appearance } = settings;
        if (typeof appearance === 'object' && appearance !== null && 'theme' in appearance && isThemePreference(appearance.theme)) {
          return appearance.theme;
        }
      }
    }
  } catch {
    return 'light';
  }
  return 'light';
}

export function resolveDarkTheme(preference: ThemePreference, systemDark: boolean): boolean {
  return preference === 'dark' || (preference === 'system' && systemDark);
}

export function applyTheme(root: HTMLElement, preference: ThemePreference, systemDark: boolean): void {
  root.classList.toggle('dark', resolveDarkTheme(preference, systemDark));
}
