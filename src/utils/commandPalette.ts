import type { Patient } from '../types';
import { formatPatientDob } from '../data/demoPatients';

export const RECENT_PATIENTS_KEY = 'coghealth_recent_patients';
const MAX_RECENT_PATIENTS = 5;

export function patientMatchesQuery(patient: Patient, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    `${patient.lastName}, ${patient.firstName}`,
    patient.firstName,
    patient.lastName,
    patient.mrn ?? '',
    patient.dateOfBirth,
    formatPatientDob(patient.dateOfBirth),
  ].some(value => value.toLowerCase().includes(normalizedQuery));
}

export function filterPatients(patients: Patient[], query: string): Patient[] {
  return patients.filter(patient => patientMatchesQuery(patient, query));
}

export function getRecentPatients(storage: Storage = sessionStorage): Patient[] {
  try {
    const value = storage.getItem(RECENT_PATIENTS_KEY);
    if (!value) return [];
    const patients = JSON.parse(value) as Patient[];
    const seen = new Set<number>();
    return patients.filter(patient => {
      if (patient.id === undefined || seen.has(patient.id)) return false;
      seen.add(patient.id);
      return true;
    }).slice(0, MAX_RECENT_PATIENTS);
  } catch {
    return [];
  }
}

export function rememberRecentPatient(patient: Patient, storage: Storage = sessionStorage): Patient[] {
  const recent = [patient, ...getRecentPatients(storage).filter(item => item.id !== patient.id)].slice(0, MAX_RECENT_PATIENTS);
  storage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(recent));
  return recent;
}

export function clearRecentPatients(storage: Storage = sessionStorage): void {
  storage.removeItem(RECENT_PATIENTS_KEY);
}
