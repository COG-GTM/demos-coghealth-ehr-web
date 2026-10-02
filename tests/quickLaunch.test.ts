import {
  addRecentId,
  fuzzyMatch,
  groupByCategory,
  parseQuery,
  rankCommands,
  type CommandItem,
} from '../src/utils/quickLaunch';

const items: CommandItem[] = [
  { id: 'p1', category: 'patient', title: 'Smith, John', subtitle: 'MRN001234', keywords: ['MRN001234'] },
  { id: 'p2', category: 'patient', title: 'Johnson, Sarah', subtitle: 'MRN001235', keywords: ['MRN001235'] },
  { id: 'n1', category: 'navigate', title: 'Schedule' },
  { id: 'n2', category: 'navigate', title: 'Lab Results' },
  { id: 'a1', category: 'action', title: 'Log Out', keywords: ['logout', 'sign out'] },
];

describe('fuzzyMatch', () => {
  test('empty query matches everything with zero score', () => {
    expect(fuzzyMatch('  ', 'Anything')).toEqual({ score: 0, indices: [] });
  });

  test('contiguous match returns its character indices', () => {
    expect(fuzzyMatch('john', 'Smith, John')?.indices).toEqual([7, 8, 9, 10]);
  });

  test('prefix match outranks mid-word match', () => {
    const prefix = fuzzyMatch('sch', 'Schedule')!;
    const middle = fuzzyMatch('sch', 'Rescheduled')!;
    expect(prefix.score).toBeGreaterThan(middle.score);
  });

  test('subsequence match is found but ranks below contiguous', () => {
    const subseq = fuzzyMatch('lbr', 'Lab Results')!;
    expect(subseq.indices).toEqual([0, 2, 4]);
    expect(subseq.score).toBeLessThan(fuzzyMatch('lab', 'Lab Results')!.score);
  });

  test('returns null when characters are missing', () => {
    expect(fuzzyMatch('xyz', 'Schedule')).toBeNull();
  });
});

describe('parseQuery', () => {
  test('> scopes to commands', () => {
    expect(parseQuery('> lab')).toEqual({ text: 'lab', scope: ['navigate', 'action'] });
  });

  test('@ scopes to patients', () => {
    expect(parseQuery('@smi')).toEqual({ text: 'smi', scope: ['recent', 'patient'] });
  });

  test('plain text is unscoped', () => {
    expect(parseQuery('  smith ')).toEqual({ text: 'smith', scope: null });
  });
});

describe('rankCommands', () => {
  test('empty query preserves original order', () => {
    expect(rankCommands(items, '').map(r => r.item.id)).toEqual(['p1', 'p2', 'n1', 'n2', 'a1']);
  });

  test('matches by MRN keyword without title highlight', () => {
    const [top] = rankCommands(items, '001235');
    expect(top.item.id).toBe('p2');
    expect(top.titleIndices).toEqual([]);
  });

  test('title prefix ranks first', () => {
    expect(rankCommands(items, 'john')[0].item.id).toBe('p2');
  });

  test('matches on keywords like "logout"', () => {
    expect(rankCommands(items, 'logout').map(r => r.item.id)).toContain('a1');
  });

  test('filters out non-matching items', () => {
    expect(rankCommands(items, 'qqq')).toEqual([]);
  });
});

describe('groupByCategory', () => {
  test('groups in order of first appearance', () => {
    const groups = groupByCategory(rankCommands(items, ''));
    expect(groups.map(g => g.category)).toEqual(['patient', 'navigate', 'action']);
    expect(groups[0].commands).toHaveLength(2);
  });
});

describe('addRecentId', () => {
  test('moves existing id to the front and caps length', () => {
    expect(addRecentId([1, 2, 3], 2)).toEqual([2, 1, 3]);
    expect(addRecentId([1, 2, 3, 4, 5], 6)).toEqual([6, 1, 2, 3, 4]);
  });
});
