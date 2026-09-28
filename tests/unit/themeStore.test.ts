import { createThemeStore, type ThemeMediaQuery } from '../../src/stores/themeStore';
import { DARK_MODE_QUERY, THEME_STORAGE_KEY, type ThemeRoot, type ThemeStorage } from '../../src/theme/theme';

class MemoryStorage implements ThemeStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.has(key) ? this.items.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class FakeMediaQuery implements ThemeMediaQuery {
  private listeners: Array<(event: { matches: boolean }) => void> = [];

  constructor(public matches: boolean) {}

  addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    this.listeners.push(listener);
  }

  emit(matches: boolean): void {
    this.matches = matches;
    this.listeners.forEach((listener) => listener({ matches }));
  }
}

function createRoot(): ThemeRoot & { classes: Set<string> } {
  const classes = new Set<string>();
  return {
    classes,
    classList: {
      toggle(token: string, force?: boolean) {
        const add = force ?? !classes.has(token);
        if (add) classes.add(token);
        else classes.delete(token);
        return add;
      },
    },
    style: { colorScheme: '' },
    dataset: {},
  };
}

function setup({ stored, systemDark = false }: { stored?: string; systemDark?: boolean } = {}) {
  const storage = new MemoryStorage();
  if (stored) storage.setItem(THEME_STORAGE_KEY, stored);
  const media = new FakeMediaQuery(systemDark);
  const root = createRoot();
  const queries: string[] = [];
  const store = createThemeStore({
    storage,
    root,
    matchMedia: (query) => {
      queries.push(query);
      return media;
    },
  });
  return { store, storage, media, root, queries };
}

describe('createThemeStore', () => {
  test('defaults to light and applies it to the root on creation', () => {
    const { store, root } = setup();
    expect(store.getState().preference).toBe('light');
    expect(store.getState().resolved).toBe('light');
    expect(root.classes.has('dark')).toBe(false);
    expect(root.dataset.theme).toBe('light');
  });

  test('restores a stored dark preference and applies it immediately', () => {
    const { store, root } = setup({ stored: 'dark' });
    expect(store.getState().preference).toBe('dark');
    expect(root.classes.has('dark')).toBe(true);
  });

  test('queries the prefers-color-scheme media query', () => {
    const { queries } = setup();
    expect(queries).toEqual([DARK_MODE_QUERY]);
  });

  test('setPreference persists, resolves and applies the theme', () => {
    const { store, storage, root } = setup();
    store.getState().setPreference('dark');
    expect(store.getState().preference).toBe('dark');
    expect(store.getState().resolved).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(root.classes.has('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  test('toggle flips between explicit light and dark', () => {
    const { store, storage, root } = setup();
    store.getState().toggle();
    expect(store.getState().preference).toBe('dark');
    expect(root.classes.has('dark')).toBe(true);
    store.getState().toggle();
    expect(store.getState().preference).toBe('light');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(root.classes.has('dark')).toBe(false);
  });

  test('toggle from system uses the currently resolved theme', () => {
    const { store } = setup({ stored: 'system', systemDark: true });
    expect(store.getState().resolved).toBe('dark');
    store.getState().toggle();
    expect(store.getState().preference).toBe('light');
    expect(store.getState().resolved).toBe('light');
  });

  test('system preference follows OS changes', () => {
    const { store, media, root } = setup({ stored: 'system' });
    expect(root.classes.has('dark')).toBe(false);
    media.emit(true);
    expect(store.getState().resolved).toBe('dark');
    expect(root.classes.has('dark')).toBe(true);
    media.emit(false);
    expect(store.getState().resolved).toBe('light');
    expect(root.classes.has('dark')).toBe(false);
  });

  test('OS changes do not override an explicit preference', () => {
    const { store, media, root } = setup({ stored: 'light' });
    media.emit(true);
    expect(store.getState().systemPrefersDark).toBe(true);
    expect(store.getState().resolved).toBe('light');
    expect(root.classes.has('dark')).toBe(false);
  });

  test('switching to system picks up the latest OS setting', () => {
    const { store, media } = setup({ stored: 'light' });
    media.emit(true);
    store.getState().setPreference('system');
    expect(store.getState().resolved).toBe('dark');
  });

  test('works without any browser environment', () => {
    const store = createThemeStore();
    expect(store.getState().resolved).toBe('light');
    expect(() => store.getState().toggle()).not.toThrow();
    expect(store.getState().resolved).toBe('dark');
  });
});
