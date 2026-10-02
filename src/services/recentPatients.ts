import type { PatientSummary } from './demoPatients';

const RECENT_PATIENTS_KEY = 'coghealth_recent_patients';
const MAX_RECENT_PATIENTS = 5;

export function getRecentPatients(): PatientSummary[] {
  try {
    const stored = sessionStorage.getItem(RECENT_PATIENTS_KEY);
    return stored ? (JSON.parse(stored) as PatientSummary[]) : [];
  } catch {
    return [];
  }
}

export function addRecentPatient(patient: PatientSummary): void {
  const recent = getRecentPatients().filter(p => p.id !== patient.id);
  recent.unshift(patient);
  sessionStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_PATIENTS)));
}

export function clearRecentPatients(): void {
  sessionStorage.removeItem(RECENT_PATIENTS_KEY);
}
