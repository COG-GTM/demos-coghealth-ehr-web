export interface DirectoryPatient {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  mrn: string;
  dob: string;
  flags?: string[];
  alerts?: string[];
}

export const patientDirectory: DirectoryPatient[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', name: 'Smith, John', mrn: 'MRN001234', dob: '03/15/1965', flags: ['FALL_RISK'] },
  { id: 2, firstName: 'Sarah', lastName: 'Johnson', name: 'Johnson, Sarah', mrn: 'MRN001235', dob: '07/22/1978' },
  { id: 3, firstName: 'Michael', lastName: 'Williams', name: 'Williams, Michael', mrn: 'MRN001236', dob: '11/08/1952', flags: ['DNR'] },
  { id: 4, firstName: 'Emily', lastName: 'Brown', name: 'Brown, Emily', mrn: 'MRN001237', dob: '04/30/1989' },
  { id: 5, firstName: 'Robert', lastName: 'Davis', name: 'Davis, Robert', mrn: 'MRN001238', dob: '08/20/1945', alerts: ['Medication review due'] },
  { id: 6, firstName: 'Maria', lastName: 'Martinez', name: 'Martinez, Maria', mrn: 'MRN001240', dob: '12/05/1970', flags: ['VIP'] },
];
