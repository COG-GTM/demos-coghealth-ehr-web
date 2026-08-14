import type { Patient } from '../types';
import { formatPatientDob } from '../data/demoPatients';

export const RECENT_PATIENTS_KEY = 'coghealth_recent_patients';
const MAX_RECENT_PATIENTS = 5;

export interface RecentPatient {
  id: number;
  mrn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

type RecentPatientInput = Omit<RecentPatient, 'id'> & { id?: number };

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

export function getRecentPatients(storage: Storage = sessionStorage): RecentPatient[] {
  try {
    const value = storage.getItem(RECENT_PATIENTS_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<number>();
    return parsed
      .filter((patient): patient is RecentPatient => {
        if (typeof patient !== 'object' || patient === null) return false;
        const record = patient as Record<string, unknown>;
        if (
          typeof record.id !== 'number' ||
          typeof record.firstName !== 'string' ||
          typeof record.lastName !== 'string' ||
          typeof record.dateOfBirth !== 'string' ||
          (record.mrn !== undefined && typeof record.mrn !== 'string') ||
          seen.has(record.id)
        ) return false;
        seen.add(record.id);
        return true;
      })
      .slice(0, MAX_RECENT_PATIENTS)
      .map(patient => ({
        id: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
      }));
  } catch {
    return [];
  }
}

export function rememberRecentPatient(patient: RecentPatientInput, storage: Storage = sessionStorage): RecentPatient[] {
  if (patient.id === undefined) return getRecentPatients(storage);
  const storedPatient: RecentPatient = {
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
  };
  const recent = [storedPatient, ...getRecentPatients(storage).filter(item => item.id !== storedPatient.id)].slice(0, MAX_RECENT_PATIENTS);
  storage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(recent));
  return recent;
}

export function clearRecentPatients(storage: Storage = sessionStorage): void {
  storage.removeItem(RECENT_PATIENTS_KEY);
}
