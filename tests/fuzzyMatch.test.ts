import { fuzzyMatch } from '../src/utils/fuzzyMatch';

describe('fuzzyMatch', () => {
  it('matches subsequences case-insensitively and returns highlight indices', () => {
    expect(fuzzyMatch('smj', 'Smith, John')).toEqual({
      score: expect.any(Number),
      indices: [0, 1, 7],
    });
  });

  it('ranks a prefix above a word-start and scattered match', () => {
    const prefix = fuzzyMatch('med', 'Medications');
    const wordStart = fuzzyMatch('med', 'Patient Medications');
    const scattered = fuzzyMatch('med', 'Patient xMed');

    expect(prefix).not.toBeNull();
    expect(wordStart).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(prefix!.score).toBeGreaterThan(wordStart!.score);
    expect(wordStart!.score).toBeGreaterThan(scattered!.score);
  });

  it('returns null when the query cannot be found in order', () => {
    expect(fuzzyMatch('xyz', 'Smith, John')).toBeNull();
  });
});
