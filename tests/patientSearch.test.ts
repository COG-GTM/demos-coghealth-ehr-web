import { filterPatients, nextActiveIndex, patientSearchStatus } from '../src/utils/patientSearch';

const patients = [
  { id: 1, name: 'Smith, John', mrn: 'MRN001234', dob: '03/15/1965' },
  { id: 2, name: 'Johnson, Sarah', mrn: 'MRN001235', dob: '07/22/1978' },
  { id: 3, name: 'Williams, Michael', mrn: 'MRN001236', dob: '11/08/1952' },
];

describe('filterPatients', () => {
  it('requires at least two characters', () => {
    expect(filterPatients(patients, 's')).toEqual([]);
    expect(filterPatients(patients, ' s ')).toEqual([]);
  });

  it('matches name or MRN case-insensitively', () => {
    expect(filterPatients(patients, 'JOHN').map(p => p.id)).toEqual([1, 2]);
    expect(filterPatients(patients, 'mrn001236').map(p => p.id)).toEqual([3]);
  });
});

describe('nextActiveIndex', () => {
  it('returns -1 when there are no options', () => {
    expect(nextActiveIndex(-1, 0, 'ArrowDown')).toBe(-1);
  });

  it('moves down and wraps to the first option', () => {
    expect(nextActiveIndex(-1, 3, 'ArrowDown')).toBe(0);
    expect(nextActiveIndex(0, 3, 'ArrowDown')).toBe(1);
    expect(nextActiveIndex(2, 3, 'ArrowDown')).toBe(0);
  });

  it('moves up and wraps to the last option', () => {
    expect(nextActiveIndex(-1, 3, 'ArrowUp')).toBe(2);
    expect(nextActiveIndex(0, 3, 'ArrowUp')).toBe(2);
    expect(nextActiveIndex(2, 3, 'ArrowUp')).toBe(1);
  });

  it('jumps with Home and End', () => {
    expect(nextActiveIndex(1, 3, 'Home')).toBe(0);
    expect(nextActiveIndex(1, 3, 'End')).toBe(2);
  });
});

describe('patientSearchStatus', () => {
  it('is silent below the minimum query length', () => {
    expect(patientSearchStatus('s', 0)).toBe('');
  });

  it('announces empty and non-empty results', () => {
    expect(patientSearchStatus('zz', 0)).toBe('No patients found');
    expect(patientSearchStatus('jo', 1)).toMatch(/^1 patient found\./);
    expect(patientSearchStatus('jo', 2)).toMatch(/^2 patients found\./);
  });
});
