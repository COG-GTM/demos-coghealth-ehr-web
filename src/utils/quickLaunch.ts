export type CommandCategory = 'recent' | 'patient' | 'navigate' | 'action';

export interface CommandItem {
  id: string;
  category: CommandCategory;
  title: string;
  subtitle?: string;
  keywords?: string[];
}

export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export interface RankedCommand<T extends CommandItem> {
  item: T;
  score: number;
  titleIndices: number[];
}

export interface CommandGroup<T extends CommandItem> {
  category: CommandCategory;
  commands: RankedCommand<T>[];
}

export interface ParsedQuery {
  text: string;
  scope: CommandCategory[] | null;
}

const CATEGORY_ORDER: CommandCategory[] = ['recent', 'patient', 'navigate', 'action'];
const WORD_BOUNDARY = /[\s,.\-:/()]/;

function isBoundary(text: string, index: number): boolean {
  return index === 0 || WORD_BOUNDARY.test(text[index - 1]);
}

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();

  const start = t.indexOf(q);
  if (start !== -1) {
    const indices = Array.from({ length: q.length }, (_, i) => start + i);
    const prefixBonus = start === 0 ? 100 : 0;
    const boundaryBonus = isBoundary(t, start) ? 50 : 0;
    return { score: 100 + prefixBonus + boundaryBonus - start, indices };
  }

  const indices: number[] = [];
  let score = 0;
  let cursor = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const found = t.indexOf(ch, cursor);
    if (found === -1) return null;
    if (indices.length > 0 && found === indices[indices.length - 1] + 1) score += 5;
    if (isBoundary(t, found)) score += 8;
    indices.push(found);
    cursor = found + 1;
  }
  const span = indices[indices.length - 1] - indices[0];
  return { score: Math.min(90, Math.max(1, score + 20 - span)), indices };
}

export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('>')) return { text: trimmed.slice(1).trim(), scope: ['navigate', 'action'] };
  if (trimmed.startsWith('@')) return { text: trimmed.slice(1).trim(), scope: ['recent', 'patient'] };
  return { text: trimmed.trim(), scope: null };
}

export function rankCommands<T extends CommandItem>(items: T[], query: string): RankedCommand<T>[] {
  const ranked: { cmd: RankedCommand<T>; order: number }[] = [];

  items.forEach((item, order) => {
    const titleMatch = fuzzyMatch(query, item.title);
    let best = titleMatch?.score ?? -1;
    for (const field of [item.subtitle, ...(item.keywords ?? [])]) {
      if (!field) continue;
      const match = fuzzyMatch(query, field);
      if (match && match.score * 0.9 > best) best = match.score * 0.9;
    }
    if (best < 0) return;
    ranked.push({
      cmd: { item, score: best, titleIndices: titleMatch?.indices ?? [] },
      order,
    });
  });

  return ranked
    .sort((a, b) =>
      b.cmd.score - a.cmd.score ||
      CATEGORY_ORDER.indexOf(a.cmd.item.category) - CATEGORY_ORDER.indexOf(b.cmd.item.category) ||
      a.order - b.order
    )
    .map(r => r.cmd);
}

export function groupByCategory<T extends CommandItem>(ranked: RankedCommand<T>[]): CommandGroup<T>[] {
  const groups: CommandGroup<T>[] = [];
  for (const cmd of ranked) {
    let group = groups.find(g => g.category === cmd.item.category);
    if (!group) {
      group = { category: cmd.item.category, commands: [] };
      groups.push(group);
    }
    group.commands.push(cmd);
  }
  return groups;
}

export function addRecentId(list: number[], id: number, max = 5): number[] {
  return [id, ...list.filter(existing => existing !== id)].slice(0, max);
}
