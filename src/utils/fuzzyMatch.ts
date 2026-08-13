export interface FuzzyMatch {
  score: number;
  indices: number[];
}

/**
 * Matches query characters in order and favors prefixes, word starts, and
 * compact matches over scattered matches.
 */
export function fuzzyMatch(query: string, value: string): FuzzyMatch | null {
  const needle = query.trim().toLowerCase();
  const haystack = value.toLowerCase();
  if (!needle) return { score: 0, indices: [] };

  const indices: number[] = [];
  let searchFrom = 0;
  for (const character of needle) {
    const index = haystack.indexOf(character, searchFrom);
    if (index === -1) return null;
    indices.push(index);
    searchFrom = index + 1;
  }

  const isPrefix = indices[0] === 0;
  const isWordStart = indices[0] === 0 || /[\s,./_-]/.test(value[indices[0] - 1]);
  const gaps = indices.slice(1).reduce((total, index, position) => (
    total + Math.max(0, index - indices[position] - 1)
  ), 0);
  const compactness = Math.max(0, value.length - gaps);
  const score = (isPrefix ? 1000 : isWordStart ? 700 : 400) + compactness - gaps * 3 - value.length / 100;

  return { score, indices };
}
