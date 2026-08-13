/// <reference types="jest" />

import { filterPatients, getRecentPatients, rememberRecentPatient } from '../src/utils/commandPalette';
import type { Patient } from '../src/types';

const patients: Patient[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', mrn: 'MRN001', dateOfBirth: '1965-03-15' },
  { id: 2, firstName: 'Sarah', lastName: 'Johnson', mrn: 'MRN002', dateOfBirth: '1978-07-22' },
];

describe('command palette utilities', () => {
  it('matches patients by name, MRN, and date of birth', () => {
    expect(filterPatients(patients, 'smith')).toEqual([patients[0]]);
    expect(filterPatients(patients, 'MRN002')).toEqual([patients[1]]);
    expect(filterPatients(patients, '1978-07')).toEqual([patients[1]]);
  });

  it('stores recent patients newest first and deduplicated', () => {
    const storage = new Map<string, string>();
    const testStorage: Storage = {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); },
      clear: () => storage.clear(),
      key: index => [...storage.keys()][index] ?? null,
      get length() { return storage.size; },
    };
    rememberRecentPatient(patients[0], testStorage);
    rememberRecentPatient(patients[1], testStorage);
    rememberRecentPatient(patients[0], testStorage);
    expect(getRecentPatients(testStorage).map(patient => patient.id)).toEqual([1, 2]);
  });
});
