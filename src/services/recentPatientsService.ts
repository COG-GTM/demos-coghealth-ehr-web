import { addRecentId } from '../utils/quickLaunch';

const RECENT_PATIENTS_KEY = 'coghealth_recent_patients';

export function getRecentPatientIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_PATIENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

export function recordRecentPatient(id: number): void {
  localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(addRecentId(getRecentPatientIds(), id)));
}
