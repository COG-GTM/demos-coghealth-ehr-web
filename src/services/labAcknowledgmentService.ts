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

export function getAcknowledgments(): Record<number, LabAcknowledgment> {
  try {
    const raw = localStorage.getItem(ACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getAcknowledgment(panelId: number): LabAcknowledgment | undefined {
  return getAcknowledgments()[panelId];
}

export function acknowledgePanel(panel: LabPanel, note: string): LabAcknowledgment {
  const acknowledgment: LabAcknowledgment = {
    panelId: panel.id,
    acknowledgedBy: CURRENT_USER_NAME,
    acknowledgedAt: new Date().toISOString(),
    note: note.trim(),
  };

  const all = getAcknowledgments();
  all[panel.id] = acknowledgment;
  localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(all));

  logLabAcknowledgment(
    panel.id,
    panel.panelName,
    panel.patientMrn,
    panel.patientName,
    getCriticalResults(panel).map(r => `${r.testName} ${r.value} ${r.unit}`.trim()),
    acknowledgment.note
  );

  return acknowledgment;
}

export function isUnacknowledgedCritical(panel: LabPanel, acknowledgments: Record<number, LabAcknowledgment>): boolean {
  return hasCriticalResult(panel) && !acknowledgments[panel.id];
}

export function getUnacknowledgedCriticalPanels(panels: LabPanel[]): LabPanel[] {
  const acknowledgments = getAcknowledgments();
  return panels.filter(p => isUnacknowledgedCritical(p, acknowledgments));
}

export function clearAcknowledgments(): void {
  localStorage.removeItem(ACK_STORAGE_KEY);
}
