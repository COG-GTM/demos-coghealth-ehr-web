import type { Patient, PatientSearchResult } from '../../../../src/types/patient';

const names = [
  ['Smith', 'John'], ['Johnson', 'Sarah'], ['Williams', 'Michael'], ['Brown', 'Emily'],
  ['Davis', 'Robert'], ['Martinez', 'Maria'], ['Garcia', 'Daniel'], ['Miller', 'Ava'],
  ['Wilson', 'James'], ['Moore', 'Olivia'], ['Taylor', 'William'], ['Anderson', 'Sophia'],
  ['Thomas', 'David'], ['Jackson', 'Isabella'], ['White', 'Joseph'], ['Harris', 'Mia'],
  ['Martin', 'Charles'], ['Thompson', 'Charlotte'], ['Garcia', 'Benjamin'], ['Lee', 'Amelia'],
] as const;

export const patients: Patient[] = names.map(([lastName, firstName], index) => ({
  id: index + 1,
  mrn: `MRN${String(1234 + index).padStart(6, '0')}`,
  firstName,
  lastName,
  middleName: index % 3 === 0 ? 'A.' : undefined,
  dateOfBirth: `19${60 + (index % 4)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
  gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
  maritalStatus: index % 3 === 0 ? 'MARRIED' : 'SINGLE',
  email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
  phoneMobile: `(555) 555-${String(1000 + index)}`,
  phoneHome: `(555) 200-${String(1000 + index)}`,
  address: {
    street1: `${100 + index} Medical Center Drive`,
    city: index % 2 === 0 ? 'Springfield' : 'Chicago',
    state: index % 2 === 0 ? 'IL' : 'WI',
    zipCode: `62${String(100 + index).padStart(3, '0')}`,
    country: 'USA',
  },
  identifiers: [{
    id: index + 1,
    identifierType: 'MRN',
    identifierValue: `MRN${String(1234 + index).padStart(6, '0')}`,
    active: true,
  }],
  active: index !== 17,
  deceased: index === 19,
  createdAt: '2024-01-01T09:00:00Z',
  updatedAt: '2024-01-15T09:00:00Z',
}));

export function searchPatients(query: string, size = 20): PatientSearchResult {
  const q = query.trim().toLowerCase();
  const content = q
    ? patients.filter((patient) =>
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(q)
      || patient.firstName.toLowerCase().includes(q)
      || patient.lastName.toLowerCase().includes(q)
      || (patient.mrn || '').toLowerCase().includes(q),
    )
    : patients;
  return {
    content: content.slice(0, size),
    totalElements: content.length,
    totalPages: Math.ceil(content.length / size),
    size,
    number: 0,
  };
}

export function patientById(id: number): Patient | undefined {
  return patients.find((patient) => patient.id === id);
}
