export type Theme = 'light' | 'dark' | 'system';

export const SETTINGS_STORAGE_KEY = 'coghealth_settings';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return 'light';
    const theme = JSON.parse(stored)?.appearance?.theme;
    return isTheme(theme) ? theme : 'light';
  } catch {
    return 'light';
  }
}

function readSettings(): Record<string, unknown> {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function persistTheme(theme: Theme) {
  try {
    const settings = readSettings();
    settings.appearance = { ...(settings.appearance as object), theme };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to persist theme:', e);
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * Applies the stored theme and keeps it in sync with the OS preference while
 * `system` is selected. Returns an unsubscribe function.
 */
export function initTheme(): () => void {
  applyTheme(getStoredTheme());

  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
