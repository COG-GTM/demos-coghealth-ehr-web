export type IllnessSeverity = 'stable' | 'watcher' | 'unstable';

export type HandoffStatus = 'draft' | 'ready' | 'accepted';

export interface HandoffAction {
  id: string;
  text: string;
  due?: string;
  done: boolean;
}

export interface Contingency {
  id: string;
  ifCondition: string;
  thenAction: string;
}

export interface HandoffEntry {
  patientId: number;
  patientName: string;
  mrn: string;
  bed: string;
  age: number;
  sex: 'M' | 'F';
  codeStatus: string;
  severity: IllnessSeverity;
  summary: string;
  actions: HandoffAction[];
  contingencies: Contingency[];
  receiver: string;
  synthesis: string;
  acceptedAt?: string;
}

export const SEVERITY_ORDER: Record<IllnessSeverity, number> = {
  unstable: 0,
  watcher: 1,
  stable: 2,
};

export const SEVERITY_LABEL: Record<IllnessSeverity, string> = {
  unstable: 'Unstable',
  watcher: 'Watcher',
  stable: 'Stable',
};

export interface IpassCheck {
  key: 'I' | 'P' | 'A' | 'S' | 'S2';
  letter: string;
  label: string;
  complete: boolean;
}

export function getIpassChecks(entry: HandoffEntry): IpassCheck[] {
  return [
    { key: 'I', letter: 'I', label: 'Illness severity', complete: Boolean(entry.severity) },
    { key: 'P', letter: 'P', label: 'Patient summary', complete: entry.summary.trim().length >= 20 },
    { key: 'A', letter: 'A', label: 'Action list', complete: entry.actions.some(a => a.text.trim().length > 0) },
    {
      key: 'S',
      letter: 'S',
      label: 'Situation awareness',
      complete:
        entry.severity === 'stable' ||
        entry.contingencies.some(c => c.ifCondition.trim() && c.thenAction.trim()),
    },
    {
      key: 'S2',
      letter: 'S',
      label: 'Synthesis by receiver',
      complete: entry.receiver.trim().length > 0 && entry.synthesis.trim().length >= 10,
    },
  ];
}

export function getHandoffStatus(entry: HandoffEntry): HandoffStatus {
  if (entry.acceptedAt) return 'accepted';
  const senderSections = getIpassChecks(entry).filter(c => c.key !== 'S2');
  return senderSections.every(c => c.complete) ? 'ready' : 'draft';
}

export function canAccept(entry: HandoffEntry): boolean {
  return !entry.acceptedAt && getIpassChecks(entry).every(c => c.complete);
}

export function sortBySeverity(entries: HandoffEntry[]): HandoffEntry[] {
  return [...entries].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.bed.localeCompare(b.bed)
  );
}

export function summarizeUnit(entries: HandoffEntry[]) {
  const counts = { unstable: 0, watcher: 0, stable: 0, accepted: 0, openActions: 0 };
  for (const e of entries) {
    counts[e.severity] += 1;
    if (e.acceptedAt) counts.accepted += 1;
    counts.openActions += e.actions.filter(a => !a.done && a.text.trim()).length;
  }
  return counts;
}

export function buildHandoffReport(entries: HandoffEntry[], from: string, unit: string, now: Date = new Date()): string {
  const lines: string[] = [];
  lines.push(`I-PASS SHIFT HANDOFF - ${unit}`);
  lines.push(`From: ${from}    Generated: ${now.toLocaleString('en-US')}`);
  lines.push('='.repeat(60));
  for (const e of sortBySeverity(entries)) {
    lines.push('');
    lines.push(`[${e.bed}] ${e.patientName} (${e.mrn}) ${e.age}${e.sex} - ${e.codeStatus}`);
    lines.push(`  I  Illness severity: ${SEVERITY_LABEL[e.severity].toUpperCase()}`);
    lines.push(`  P  Summary: ${e.summary.trim() || '(none)'}`);
    const actions = e.actions.filter(a => a.text.trim());
    lines.push(`  A  Actions:${actions.length ? '' : ' (none)'}`);
    for (const a of actions) {
      lines.push(`       [${a.done ? 'x' : ' '}] ${a.text.trim()}${a.due ? ` (by ${a.due})` : ''}`);
    }
    const contingencies = e.contingencies.filter(c => c.ifCondition.trim() && c.thenAction.trim());
    lines.push(`  S  Contingencies:${contingencies.length ? '' : ' (none)'}`);
    for (const c of contingencies) {
      lines.push(`       IF ${c.ifCondition.trim()} -> THEN ${c.thenAction.trim()}`);
    }
    if (e.acceptedAt) {
      lines.push(`  S  Synthesis (${e.receiver.trim()}, accepted ${e.acceptedAt}): ${e.synthesis.trim()}`);
    } else {
      lines.push('  S  Synthesis: PENDING - not yet accepted by receiver');
    }
  }
  return lines.join('\n');
}
