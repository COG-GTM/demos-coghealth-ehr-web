export const SUBSTRING_SCORE_FLOOR = 500;

export function scoreCommand(haystack: string, query: string): number {
  if (!query) return 0;
  const target = haystack.toLowerCase();
  const needle = query.toLowerCase();

  const direct = target.indexOf(needle);
  if (direct === 0) return 1000;
  if (direct > 0) return Math.max(SUBSTRING_SCORE_FLOOR, 800 - direct);

  let score = 0;
  let cursor = 0;
  for (const char of needle) {
    const found = target.indexOf(char, cursor);
    if (found === -1) return -1;
    score += found === cursor ? 10 : 2;
    cursor = found + 1;
  }
  return score;
}
