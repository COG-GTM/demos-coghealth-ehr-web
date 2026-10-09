export type PatientFlag = 'FALL_RISK' | 'ALLERGY' | 'ISOLATION' | 'DNR' | 'VIP' | 'DIFFICULT_IV';

export const flagConfig: Record<string, { label: string; color: string; bg: string }> = {
  FALL_RISK: { label: 'Fall Risk', color: 'text-gray-800', bg: 'bg-gray-200' },
  ALLERGY: { label: 'Allergy', color: 'text-gray-800', bg: 'bg-gray-200' },
  ISOLATION: { label: 'Isolation', color: 'text-gray-800', bg: 'bg-gray-200' },
  DNR: { label: 'DNR/DNI', color: 'text-gray-800', bg: 'bg-gray-300' },
  VIP: { label: 'VIP', color: 'text-gray-700', bg: 'bg-gray-100' },
  DIFFICULT_IV: { label: 'Diff IV', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export const MAX_VISIBLE_FLAGS = 3;

export function flagLabel(flag: string): string {
  return flagConfig[flag]?.label ?? flag;
}

export function hiddenFlagsLabel(flags: string[]): string {
  const hidden = flags.slice(MAX_VISIBLE_FLAGS);
  if (hidden.length === 0) return '';
  const noun = hidden.length === 1 ? 'flag' : 'flags';
  return `${hidden.length} more ${noun}: ${hidden.map(flagLabel).join(', ')}`;
}

export function alertsLabel(alerts: string[]): string {
  return alerts.length === 0 ? '' : `Alerts: ${alerts.join('; ')}`;
}

export function openEncountersLabel(count: number): string {
  return `${count} open ${count === 1 ? 'encounter' : 'encounters'}`;
}
