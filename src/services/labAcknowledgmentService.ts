import type { LabAcknowledgment, LabPanel } from '../types';
import { logLabAcknowledgment } from './auditService';

const ACK_STORAGE_KEY = 'coghealth_lab_acknowledgments';

export const CURRENT_USER_NAME = 'Dr. Sarah Anderson';

export function getCriticalResults(panel: LabPanel) {
  return panel.results.filter(r => r.status === 'critical');
}

export function hasCriticalResult(panel: LabPanel): boolean {
  return getCriticalResults(panel).length > 0;
}

export function getCriticalFingerprint(panel: LabPanel): string {
  return getCriticalResults(panel)
    .map(r => `${r.id}:${r.value}:${r.unit}`)
    .sort()
    .join('|');
}

function isLabAcknowledgment(value: unknown): value is LabAcknowledgment {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.panelId === 'number' &&
    typeof v.acknowledgedBy === 'string' &&
    typeof v.acknowledgedAt === 'string' &&
    typeof v.note === 'string' &&
    typeof v.criticalFingerprint === 'string'
  );
}

export function getAcknowledgments(): Record<number, LabAcknowledgment> {
  try {
    const raw = localStorage.getItem(ACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const valid: Record<number, LabAcknowledgment> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      const panelId = Number(key);
      if (Number.isInteger(panelId) && isLabAcknowledgment(entry) && entry.panelId === panelId) {
        valid[panelId] = entry;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function getAcknowledgment(panelId: number): LabAcknowledgment | undefined {
  return getAcknowledgments()[panelId];
}

export function getValidAcknowledgment(
  panel: LabPanel,
  acknowledgments: Record<number, LabAcknowledgment>
): LabAcknowledgment | undefined {
  const ack = acknowledgments[panel.id];
  return ack && ack.criticalFingerprint === getCriticalFingerprint(panel) ? ack : undefined;
}

export function acknowledgePanel(panel: LabPanel, note: string): LabAcknowledgment {
  const acknowledgment: LabAcknowledgment = {
    panelId: panel.id,
    acknowledgedBy: CURRENT_USER_NAME,
    acknowledgedAt: new Date().toISOString(),
    note: note.trim(),
    criticalFingerprint: getCriticalFingerprint(panel),
  };

  logLabAcknowledgment(
    panel.id,
    panel.panelName,
    panel.patientMrn,
    panel.patientName,
    getCriticalResults(panel).map(r => `${r.testName} ${r.value} ${r.unit}`.trim()),
    acknowledgment.note
  );

  const all = getAcknowledgments();
  all[panel.id] = acknowledgment;
  localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(all));

  return acknowledgment;
}

export function isUnacknowledgedCritical(panel: LabPanel, acknowledgments: Record<number, LabAcknowledgment>): boolean {
  return hasCriticalResult(panel) && !getValidAcknowledgment(panel, acknowledgments);
}

export function getUnacknowledgedCriticalPanels(panels: LabPanel[]): LabPanel[] {
  const acknowledgments = getAcknowledgments();
  return panels.filter(p => isUnacknowledgedCritical(p, acknowledgments));
}

export function clearAcknowledgments(): void {
  localStorage.removeItem(ACK_STORAGE_KEY);
}
