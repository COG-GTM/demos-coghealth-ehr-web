export interface PatientSearchResult {
  id: number;
  name: string;
  mrn: string;
  dob: string;
}

export const MIN_PATIENT_SEARCH_LENGTH = 2;

export function filterPatients<T extends PatientSearchResult>(patients: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < MIN_PATIENT_SEARCH_LENGTH) return [];
  return patients.filter(p => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q));
}

export type ListNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function nextActiveIndex(current: number, count: number, key: ListNavigationKey): number {
  if (count <= 0) return -1;
  switch (key) {
    case 'ArrowDown':
      return current < 0 || current >= count - 1 ? 0 : current + 1;
    case 'ArrowUp':
      return current <= 0 ? count - 1 : current - 1;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
  }
}

export function patientSearchStatus(query: string, resultCount: number): string {
  if (query.trim().length < MIN_PATIENT_SEARCH_LENGTH) return '';
  if (resultCount === 0) return 'No patients found';
  return `${resultCount} patient${resultCount === 1 ? '' : 's'} found. Use up and down arrows to review, Enter to open.`;
}
