import { fuzzyMatch, rankFuzzy } from '../src/utils/fuzzyMatcher';

describe('fuzzyMatcher', () => {
  test('matches characters as a case-insensitive subsequence', () => {
    expect(fuzzyMatch('smi', 'Smith, John')).toEqual(expect.objectContaining({
      indices: [0, 1, 2],
    }));
    expect(fuzzyMatch('xyz', 'Smith, John')).toBeNull();
  });

  test('scores contiguous and word-boundary matches above scattered matches', () => {
    const contiguous = fuzzyMatch('pat', 'Patient Chart');
    const scattered = fuzzyMatch('pat', 'Medication and patient');
    expect(contiguous).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(contiguous!.score).toBeGreaterThan(scattered!.score);
  });

  test('ranks fields and preserves source order for ties', () => {
    const results = rankFuzzy('mrn1', [
      { label: 'Alpha', mrn: 'MRN100' },
      { label: 'Beta', mrn: 'MRN101' },
    ], item => [item.label, item.mrn]);
    expect(results.map(result => result.item.label)).toEqual(['Alpha', 'Beta']);
    expect(results[0]?.matchedField).toBe(1);
  });
});
