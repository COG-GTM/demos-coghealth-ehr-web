import { bestFuzzyMatch, fuzzyMatch } from '../src/utils/fuzzyMatch';

describe('fuzzyMatch', () => {
  test('empty query matches everything with neutral score', () => {
    expect(fuzzyMatch('', 'Smith, John')).toEqual({ score: 0, positions: [] });
  });

  test('returns null when characters are not a subsequence', () => {
    expect(fuzzyMatch('xyz', 'Smith, John')).toBeNull();
    expect(fuzzyMatch('nhoj', 'Smith, John')).toBeNull();
  });

  test('is case-insensitive and reports matched positions', () => {
    expect(fuzzyMatch('SMI', 'Smith, John')?.positions).toEqual([0, 1, 2]);
  });

  test('prefers word starts for initials-style queries', () => {
    expect(fuzzyMatch('sj', 'Smith, John')?.positions).toEqual([0, 7]);
  });

  test('ranks prefix and contiguous matches above scattered ones', () => {
    const prefix = fuzzyMatch('lab', 'Lab Results')!;
    const scattered = fuzzyMatch('lab', 'Clinical Abstracts')!;
    expect(prefix.score).toBeGreaterThan(scattered.score);
  });

  test('ignores spaces in the query', () => {
    expect(fuzzyMatch('lab res', 'Lab Results')).not.toBeNull();
  });
});

describe('bestFuzzyMatch', () => {
  test('picks the highest scoring field and reports its index', () => {
    const match = bestFuzzyMatch('001236', ['Williams, Michael', 'MRN001236', '11/08/1952']);
    expect(match?.field).toBe(1);
  });

  test('returns null when no field matches', () => {
    expect(bestFuzzyMatch('zzz', ['Williams, Michael', 'MRN001236'])).toBeNull();
  });
});
