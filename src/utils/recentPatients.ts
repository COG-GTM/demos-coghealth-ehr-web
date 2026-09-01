export interface RecentPatient {
  id: number;
  name: string;
  mrn: string;
}

const RECENT_PATIENTS_KEY = 'coghealth.recentPatients';

const isRecentPatient = (value: unknown): value is RecentPatient => {
  if (typeof value !== 'object' || value === null) return false;
  const patient = value as Record<string, unknown>;
  return (
    typeof patient.id === 'number' &&
    typeof patient.name === 'string' &&
    typeof patient.mrn === 'string'
  );
};

export function getRecentPatients(): RecentPatient[] {
  try {
    const stored = localStorage.getItem(RECENT_PATIENTS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isRecentPatient).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function addRecentPatient(patient: RecentPatient): void {
  try {
    const patients = getRecentPatients().filter((item) => item.id !== patient.id);
    localStorage.setItem(
      RECENT_PATIENTS_KEY,
      JSON.stringify([patient, ...patients].slice(0, 5)),
    );
  } catch {
    return;
  }
}
