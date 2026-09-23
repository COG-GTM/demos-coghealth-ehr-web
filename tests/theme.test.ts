import {
  DARK_CLASS,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  createThemeStore,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type SystemThemeQuery,
  type ThemeRoot,
  type ThemeStorage,
} from '../src/theme/themeStore';

function createStorage(initial: Record<string, string> = {}): ThemeStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
}

function createRoot(): ThemeRoot & { classes: Set<string> } {
  const classes = new Set<string>();
  return {
    classes,
    classList: {
      add: (token) => { classes.add(token); },
      remove: (token) => { classes.delete(token); },
    },
    style: { colorScheme: '' },
  };
}

function createSystemQuery(matches: boolean): SystemThemeQuery & { setMatches(next: boolean): void } {
  const listeners = new Set<() => void>();
  const query = {
    matches,
    addEventListener: (_type: 'change', listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_type: 'change', listener: () => void) => { listeners.delete(listener); },
    setMatches(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
  return query;
}

describe('theme helpers', () => {
  describe('isThemePreference', () => {
    test.each(['light', 'dark', 'system'])('accepts %s', (value) => {
      expect(isThemePreference(value)).toBe(true);
    });

    test.each(['auto', '', 'DARK', null, undefined, 42, {}])('rejects %p', (value) => {
      expect(isThemePreference(value)).toBe(false);
    });
  });

  describe('resolveTheme', () => {
    test('explicit preferences ignore the system setting', () => {
      expect(resolveTheme('light', true)).toBe('light');
      expect(resolveTheme('dark', false)).toBe('dark');
    });

    test('system preference follows the OS setting', () => {
      expect(resolveTheme('system', true)).toBe('dark');
      expect(resolveTheme('system', false)).toBe('light');
    });
  });

  describe('readStoredTheme', () => {
    test('returns the default when nothing is stored', () => {
      expect(readStoredTheme(createStorage())).toBe(DEFAULT_THEME);
      expect(readStoredTheme(null)).toBe(DEFAULT_THEME);
    });

    test('returns the stored preference', () => {
      expect(readStoredTheme(createStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark');
      expect(readStoredTheme(createStorage({ [THEME_STORAGE_KEY]: 'system' }))).toBe('system');
    });

    test('falls back to the default for corrupt values', () => {
      expect(readStoredTheme(createStorage({ [THEME_STORAGE_KEY]: 'blue' }))).toBe(DEFAULT_THEME);
    });

    test('falls back to the default when storage throws', () => {
      const storage: ThemeStorage = {
        getItem: () => { throw new Error('SecurityError'); },
        setItem: () => {},
        removeItem: () => {},
      };
      expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
    });
  });

  describe('writeStoredTheme', () => {
    test('persists under the theme key', () => {
      const storage = createStorage();
      writeStoredTheme(storage, 'dark');
      expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark');
    });

    test('swallows storage errors', () => {
      const storage: ThemeStorage = {
        getItem: () => null,
        setItem: () => { throw new Error('QuotaExceededError'); },
        removeItem: () => {},
      };
      expect(() => writeStoredTheme(storage, 'dark')).not.toThrow();
    });
  });

  describe('applyResolvedTheme', () => {
    test('adds the dark class and color-scheme for dark', () => {
      const root = createRoot();
      applyResolvedTheme(root, 'dark');
      expect(root.classes.has(DARK_CLASS)).toBe(true);
      expect(root.style.colorScheme).toBe('dark');
    });

    test('removes the dark class and resets color-scheme for light', () => {
      const root = createRoot();
      root.classes.add(DARK_CLASS);
      applyResolvedTheme(root, 'light');
      expect(root.classes.has(DARK_CLASS)).toBe(false);
      expect(root.style.colorScheme).toBe('light');
    });

    test('is a no-op without a root', () => {
      expect(() => applyResolvedTheme(null, 'dark')).not.toThrow();
    });
  });
});

describe('createThemeStore', () => {
  test('defaults to light and leaves the document unthemed', () => {
    const root = createRoot();
    const store = createThemeStore({ storage: createStorage(), root, systemQuery: createSystemQuery(true) });
    expect(store.getPreference()).toBe('light');
    expect(store.getResolved()).toBe('light');
    expect(root.classes.has(DARK_CLASS)).toBe(false);
  });

  test('applies a stored dark preference on creation', () => {
    const root = createRoot();
    const store = createThemeStore({
      storage: createStorage({ [THEME_STORAGE_KEY]: 'dark' }),
      root,
      systemQuery: createSystemQuery(false),
    });
    expect(store.getResolved()).toBe('dark');
    expect(root.classes.has(DARK_CLASS)).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  test('setPreference updates the document, persists, and notifies subscribers', () => {
    const storage = createStorage();
    const root = createRoot();
    const store = createThemeStore({ storage, root, systemQuery: createSystemQuery(false) });
    const listener = jest.fn();
    store.subscribe(listener);

    store.setPreference('dark');

    expect(store.getPreference()).toBe('dark');
    expect(store.getResolved()).toBe('dark');
    expect(root.classes.has(DARK_CLASS)).toBe(true);
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('setPreference with the current value is a no-op', () => {
    const storage = createStorage();
    const store = createThemeStore({ storage, root: createRoot(), systemQuery: createSystemQuery(false) });
    const listener = jest.fn();
    store.subscribe(listener);

    store.setPreference('light');

    expect(listener).not.toHaveBeenCalled();
    expect(storage.data.has(THEME_STORAGE_KEY)).toBe(false);
  });

  test('toggle flips between light and dark based on the resolved theme', () => {
    const root = createRoot();
    const store = createThemeStore({
      storage: createStorage({ [THEME_STORAGE_KEY]: 'system' }),
      root,
      systemQuery: createSystemQuery(true),
    });
    expect(store.getResolved()).toBe('dark');

    store.toggle();
    expect(store.getPreference()).toBe('light');
    expect(root.classes.has(DARK_CLASS)).toBe(false);

    store.toggle();
    expect(store.getPreference()).toBe('dark');
    expect(root.classes.has(DARK_CLASS)).toBe(true);
  });

  test('system preference tracks OS changes', () => {
    const root = createRoot();
    const systemQuery = createSystemQuery(false);
    const store = createThemeStore({
      storage: createStorage({ [THEME_STORAGE_KEY]: 'system' }),
      root,
      systemQuery,
    });
    const listener = jest.fn();
    store.subscribe(listener);
    expect(store.getResolved()).toBe('light');

    systemQuery.setMatches(true);
    expect(store.getResolved()).toBe('dark');
    expect(root.classes.has(DARK_CLASS)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    systemQuery.setMatches(false);
    expect(store.getResolved()).toBe('light');
    expect(root.classes.has(DARK_CLASS)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('explicit preference ignores OS changes', () => {
    const root = createRoot();
    const systemQuery = createSystemQuery(false);
    const store = createThemeStore({ storage: createStorage(), root, systemQuery });
    const listener = jest.fn();
    store.subscribe(listener);

    systemQuery.setMatches(true);

    expect(store.getResolved()).toBe('light');
    expect(root.classes.has(DARK_CLASS)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  test('switching from dark to system resolves against the OS immediately', () => {
    const root = createRoot();
    const store = createThemeStore({
      storage: createStorage({ [THEME_STORAGE_KEY]: 'dark' }),
      root,
      systemQuery: createSystemQuery(false),
    });

    store.setPreference('system');

    expect(store.getPreference()).toBe('system');
    expect(store.getResolved()).toBe('light');
    expect(root.classes.has(DARK_CLASS)).toBe(false);
  });

  test('unsubscribe stops notifications', () => {
    const store = createThemeStore({ storage: createStorage(), root: createRoot(), systemQuery: createSystemQuery(false) });
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.setPreference('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  test('destroy detaches the OS listener', () => {
    const root = createRoot();
    const systemQuery = createSystemQuery(false);
    const store = createThemeStore({
      storage: createStorage({ [THEME_STORAGE_KEY]: 'system' }),
      root,
      systemQuery,
    });

    store.destroy();
    systemQuery.setMatches(true);

    expect(store.getResolved()).toBe('light');
    expect(root.classes.has(DARK_CLASS)).toBe(false);
  });

  test('works without storage, root, or system query', () => {
    const store = createThemeStore();
    expect(store.getResolved()).toBe('light');
    store.setPreference('system');
    expect(store.getResolved()).toBe('light');
    store.setPreference('dark');
    expect(store.getResolved()).toBe('dark');
  });
});
