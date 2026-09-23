import { applyTheme, isThemePreference, readThemePreference, resolveDarkTheme, SETTINGS_KEY } from '../src/theme';

describe('theme preferences', () => {
  const storage = (value: string | null): Pick<Storage, 'getItem'> => ({
    getItem: jest.fn().mockReturnValue(value),
  });

  test.each(['light', 'dark', 'system'] as const)('restores saved %s preference', (theme) => {
    const saved = storage(JSON.stringify({ appearance: { theme }, profile: { firstName: 'Sarah' } }));
    expect(readThemePreference(saved)).toBe(theme);
    expect(saved.getItem).toHaveBeenCalledWith(SETTINGS_KEY);
    expect(isThemePreference(theme)).toBe(true);
  });

  test.each([null, '{not json', '{}', '{"appearance":{"theme":"invalid"}}', 'null'])(
    'uses light for missing or invalid settings: %s',
    (value) => {
      expect(readThemePreference(storage(value))).toBe('light');
    },
  );

  test('uses light when storage is unavailable', () => {
    expect(readThemePreference({ getItem: () => { throw new Error('Blocked'); } })).toBe('light');
  });

  test.each([
    ['light', false, false],
    ['light', true, false],
    ['dark', false, true],
    ['dark', true, true],
    ['system', false, false],
    ['system', true, true],
  ] as const)('resolves %s with system dark=%s to dark=%s', (theme, systemDark, expected) => {
    expect(resolveDarkTheme(theme, systemDark)).toBe(expected);
    const toggle = jest.fn();
    const root = { classList: { toggle } } as unknown as HTMLElement;
    applyTheme(root, theme, systemDark);
    expect(toggle).toHaveBeenCalledWith('dark', expected);
  });
});
