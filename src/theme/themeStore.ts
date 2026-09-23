export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'coghealth_theme';
export const DARK_CLASS = 'dark';
export const DEFAULT_THEME: ThemePreference = 'light';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ThemeRoot {
  classList: { add(token: string): void; remove(token: string): void };
  style: { colorScheme: string };
}

export interface SystemThemeQuery {
  matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

export interface ThemeStoreOptions {
  storage?: ThemeStorage | null;
  root?: ThemeRoot | null;
  systemQuery?: SystemThemeQuery | null;
}

export interface ThemeStore {
  getPreference(): ThemePreference;
  getResolved(): ResolvedTheme;
  setPreference(preference: ThemePreference): void;
  toggle(): void;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function readStoredTheme(storage: ThemeStorage | null | undefined): ThemePreference {
  if (!storage) return DEFAULT_THEME;
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(storage: ThemeStorage | null | undefined, preference: ThemePreference): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // storage may be unavailable (private mode, quota); theme still applies for the session
  }
}

export function applyResolvedTheme(root: ThemeRoot | null | undefined, resolved: ResolvedTheme): void {
  if (!root) return;
  if (resolved === 'dark') {
    root.classList.add(DARK_CLASS);
  } else {
    root.classList.remove(DARK_CLASS);
  }
  root.style.colorScheme = resolved;
}

export function createThemeStore(options: ThemeStoreOptions = {}): ThemeStore {
  const { storage = null, root = null, systemQuery = null } = options;
  const listeners = new Set<() => void>();

  let preference = readStoredTheme(storage);
  let resolved = resolveTheme(preference, systemQuery?.matches ?? false);

  const notify = () => listeners.forEach((listener) => listener());

  const update = () => {
    const next = resolveTheme(preference, systemQuery?.matches ?? false);
    if (next !== resolved) {
      resolved = next;
      applyResolvedTheme(root, resolved);
    }
  };

  const handleSystemChange = () => {
    if (preference !== 'system') return;
    update();
    notify();
  };

  applyResolvedTheme(root, resolved);
  systemQuery?.addEventListener('change', handleSystemChange);

  return {
    getPreference: () => preference,
    getResolved: () => resolved,
    setPreference(next) {
      if (next === preference) return;
      preference = next;
      writeStoredTheme(storage, next);
      update();
      notify();
    },
    toggle() {
      this.setPreference(resolved === 'dark' ? 'light' : 'dark');
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      systemQuery?.removeEventListener('change', handleSystemChange);
      listeners.clear();
    },
  };
}
