import {
  DEFAULT_THEME,
  LEGACY_SETTINGS_KEY,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ThemeRoot,
  type ThemeStorage,
} from '../../src/theme/theme';

class MemoryStorage implements ThemeStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.has(key) ? this.items.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class ThrowingStorage implements ThemeStorage {
  getItem(): string | null {
    throw new Error('storage disabled');
  }

  setItem(): void {
    throw new Error('storage disabled');
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

describe('isThemePreference', () => {
  test.each(['light', 'dark', 'system'])('accepts %s', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  test.each([undefined, null, '', 'Dark', 'blue', 1, {}])('rejects %p', (value) => {
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
  test('returns the default when storage is unavailable or empty', () => {
    expect(readStoredTheme(undefined)).toBe(DEFAULT_THEME);
    expect(readStoredTheme(new MemoryStorage())).toBe(DEFAULT_THEME);
  });

  test('returns a valid stored preference', () => {
    const storage = new MemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme(storage)).toBe('dark');
  });

  test('ignores an invalid stored preference', () => {
    const storage = new MemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
  });

  test('falls back to the theme saved by the legacy settings page', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ appearance: { theme: 'system' } }));
    expect(readStoredTheme(storage)).toBe('system');
  });

  test('prefers the dedicated key over legacy settings', () => {
    const storage = new MemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, 'light');
    storage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ appearance: { theme: 'dark' } }));
    expect(readStoredTheme(storage)).toBe('light');
  });

  test('tolerates malformed legacy settings', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SETTINGS_KEY, '{not json');
    expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
  });

  test('returns the default when storage throws', () => {
    expect(readStoredTheme(new ThrowingStorage())).toBe(DEFAULT_THEME);
  });
});

describe('writeStoredTheme', () => {
  test('persists the preference under the theme key', () => {
    const storage = new MemoryStorage();
    writeStoredTheme(storage, 'system');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  test('does not throw when storage is missing or throws', () => {
    expect(() => writeStoredTheme(undefined, 'dark')).not.toThrow();
    expect(() => writeStoredTheme(new ThrowingStorage(), 'dark')).not.toThrow();
  });
});

describe('applyTheme', () => {
  test('adds the dark class, color scheme and data attribute for dark', () => {
    const root = createRoot();
    applyTheme(root, 'dark');
    expect(root.classes.has('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  test('removes the dark class when switching back to light', () => {
    const root = createRoot();
    applyTheme(root, 'dark');
    applyTheme(root, 'light');
    expect(root.classes.has('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });

  test('is a no-op without a root element', () => {
    expect(() => applyTheme(undefined, 'dark')).not.toThrow();
  });
});
