export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export interface RankedMatch<T> extends FuzzyMatch {
  item: T;
  matchedField: number;
}

function isWordBoundary(text: string, index: number): boolean {
  return index === 0 || /[\s,._:/-]/.test(text[index - 1] ?? '');
}

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedText = text.toLowerCase();
  if (!normalizedQuery) return { score: 0, indices: [] };

  const indices: number[] = [];
  let textIndex = 0;

  for (const character of normalizedQuery) {
    const matchIndex = normalizedText.indexOf(character, textIndex);
    if (matchIndex === -1) return null;
    indices.push(matchIndex);
    textIndex = matchIndex + 1;
  }

  let score = 0;
  indices.forEach((index, indexInQuery) => {
    if (index === indexInQuery) score += 70;
    if (isWordBoundary(text, index)) score += 35;
    if (index > 0 && indices[indexInQuery - 1] === index - 1) score += 24;
    score -= Math.max(0, index - (indices[indexInQuery - 1] ?? 0) - 1);
  });
  score -= indices[0] ?? 0;

  return { score, indices };
}

export function rankFuzzy<T>(
  query: string,
  items: T[],
  fields: (item: T) => string[],
): RankedMatch<T>[] {
  const normalizedQuery = query.trim();
  return items
    .map((item, itemIndex) => {
      const matches = fields(item)
        .map((field, fieldIndex) => ({ match: fuzzyMatch(normalizedQuery, field), fieldIndex }))
        .filter((result): result is { match: FuzzyMatch; fieldIndex: number } => result.match !== null);
      if (matches.length === 0) return null;
      const best = matches.reduce((current, candidate) => (
        candidate.match.score > current.match.score ? candidate : current
      ));
      return { ...best.match, item, matchedField: best.fieldIndex, itemIndex };
    })
    .filter((result): result is RankedMatch<T> & { itemIndex: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.itemIndex - b.itemIndex);
}
