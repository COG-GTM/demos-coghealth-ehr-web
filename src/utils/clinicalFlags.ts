export interface ClinicalFlag {
  code: string;
  label: string;
}

const PROBLEM_PRIORITIES: Record<string, ClinicalFlag> = {
  high: { code: 'H', label: 'High priority' },
  medium: { code: 'M', label: 'Medium priority' },
  low: { code: 'L', label: 'Low priority' },
};

const LAB_FLAGS: Record<string, ClinicalFlag> = {
  critical: { code: 'C', label: 'Critical' },
  'critical high': { code: 'HH', label: 'Critical high' },
  'critical low': { code: 'LL', label: 'Critical low' },
  high: { code: 'H', label: 'High' },
  low: { code: 'L', label: 'Low' },
  abnormal: { code: 'A', label: 'Abnormal' },
};

export function problemPriorityFlag(priority: string): ClinicalFlag {
  return PROBLEM_PRIORITIES[priority.trim().toLowerCase()] ?? PROBLEM_PRIORITIES.low;
}

export function labResultFlag(status: string): ClinicalFlag | null {
  return LAB_FLAGS[status.trim().toLowerCase()] ?? null;
}

export function isCriticalLabFlag(flag: ClinicalFlag | null): boolean {
  return flag !== null && flag.label.startsWith('Critical');
}
