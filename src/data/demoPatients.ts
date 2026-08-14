import type { Patient } from '../types';

export const demoPatients: Patient[] = [
  { id: 1, mrn: 'MRN001234', firstName: 'John', lastName: 'Smith', dateOfBirth: '1965-03-15', gender: 'MALE', phoneMobile: '(555) 123-4567', email: 'john.smith@email.com', active: true },
  { id: 2, mrn: 'MRN001235', firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1978-07-22', gender: 'FEMALE', phoneMobile: '(555) 234-5678', email: 'sarah.j@email.com', active: true },
  { id: 3, mrn: 'MRN001236', firstName: 'Michael', lastName: 'Williams', dateOfBirth: '1952-11-08', gender: 'MALE', phoneMobile: '(555) 345-6789', active: true },
  { id: 4, mrn: 'MRN001237', firstName: 'Emily', lastName: 'Brown', dateOfBirth: '1989-04-30', gender: 'FEMALE', active: true },
  { id: 5, mrn: 'MRN001238', firstName: 'Robert', lastName: 'Davis', dateOfBirth: '1945-08-20', gender: 'MALE', active: true },
  { id: 6, mrn: 'MRN001240', firstName: 'Maria', lastName: 'Martinez', dateOfBirth: '1970-12-05', gender: 'FEMALE', active: true },
];

export function formatPatientName(patient: Pick<Patient, 'firstName' | 'lastName'>): string {
  return `${patient.lastName}, ${patient.firstName}`;
}

export function formatPatientDob(dateOfBirth: string): string {
  const [datePart] = dateOfBirth.split('T');
  const [year, month, day] = datePart.split('-');
  return year && month && day ? `${month}/${day}/${year}` : dateOfBirth;
}
