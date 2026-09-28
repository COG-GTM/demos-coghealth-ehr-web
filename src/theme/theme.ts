export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'coghealth_theme';
export const LEGACY_SETTINGS_KEY = 'coghealth_settings';
export const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';
export const DEFAULT_THEME: ThemePreference = 'light';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ThemeRoot {
  classList: { toggle(token: string, force?: boolean): boolean };
  style: { colorScheme: string };
  dataset: { theme?: string };
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return preference;
}

function readLegacyTheme(storage: ThemeStorage): ThemePreference | null {
  const raw = storage.getItem(LEGACY_SETTINGS_KEY);
  if (!raw) return null;
  try {
    const theme: unknown = JSON.parse(raw)?.appearance?.theme;
    return isThemePreference(theme) ? theme : null;
  } catch {
    return null;
  }
}

export function readStoredTheme(storage: ThemeStorage | undefined): ThemePreference {
  if (!storage) return DEFAULT_THEME;
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
    return readLegacyTheme(storage) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(storage: ThemeStorage | undefined, preference: ThemePreference): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage may be unavailable (private mode, quota); theme still applies for this session.
  }
}

export function applyTheme(root: ThemeRoot | undefined, resolved: ResolvedTheme): void {
  if (!root) return;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;
}
