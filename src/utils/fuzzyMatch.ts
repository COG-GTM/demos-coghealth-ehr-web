export interface FuzzyMatch {
  score: number;
  positions: number[];
}

const WORD_SEPARATORS = new Set([' ', ',', '-', '_', '/', '(', ')', '.', ':']);

function isWordStart(text: string, index: number): boolean {
  return index === 0 || WORD_SEPARATORS.has(text[index - 1]);
}

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return { score: 0, positions: [] };

  const haystack = text.toLowerCase();
  const positions: number[] = [];
  let score = 0;
  let searchFrom = 0;
  let previous = -2;

  for (const char of needle) {
    if (char === ' ') continue;
    let index = -1;
    for (let i = searchFrom; i < haystack.length; i++) {
      if (haystack[i] !== char) continue;
      if (index === -1) index = i;
      if (i === previous + 1 || isWordStart(text, i)) {
        index = i;
        break;
      }
    }
    if (index === -1) return null;

    score += 1;
    if (index === previous + 1) score += 5;
    if (isWordStart(text, index)) score += 8;
    if (index === 0) score += 4;
    score -= Math.min(index - searchFrom, 10) * 0.1;

    positions.push(index);
    previous = index;
    searchFrom = index + 1;
  }

  if (haystack.startsWith(needle)) score += 10;
  score -= text.length * 0.01;

  return { score, positions };
}

export function bestFuzzyMatch(query: string, fields: string[]): (FuzzyMatch & { field: number }) | null {
  let best: (FuzzyMatch & { field: number }) | null = null;
  fields.forEach((field, i) => {
    const match = fuzzyMatch(query, field);
    if (match && (!best || match.score > best.score)) {
      best = { ...match, field: i };
    }
  });
  return best;
}
