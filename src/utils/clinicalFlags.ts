export interface ClinicalFlag {
  code: string;
  label: string;
}

const PROBLEM_PRIORITIES = new Map<string, ClinicalFlag>(Object.entries({
  high: { code: 'H', label: 'High priority' },
  medium: { code: 'M', label: 'Medium priority' },
  low: { code: 'L', label: 'Low priority' },
}));

const LAB_FLAGS = new Map<string, ClinicalFlag>(Object.entries({
  critical: { code: 'C', label: 'Critical' },
  'critical high': { code: 'HH', label: 'Critical high' },
  'critical low': { code: 'LL', label: 'Critical low' },
  high: { code: 'H', label: 'High' },
  low: { code: 'L', label: 'Low' },
  abnormal: { code: 'A', label: 'Abnormal' },
}));

const LOW_PRIORITY: ClinicalFlag = { code: 'L', label: 'Low priority' };

export function problemPriorityFlag(priority: string): ClinicalFlag {
  return PROBLEM_PRIORITIES.get(priority.trim().toLowerCase()) ?? LOW_PRIORITY;
}

export function labResultFlag(status: string): ClinicalFlag | null {
  return LAB_FLAGS.get(status.trim().toLowerCase()) ?? null;
}

export function isCriticalLabFlag(flag: ClinicalFlag | null): boolean {
  return flag !== null && flag.label.startsWith('Critical');
}
