import { patientListStatusMessage } from '../src/pages/patientSearchStatus';

describe('patientListStatusMessage', () => {
  it('announces loading while a fetch is in flight', () => {
    expect(patientListStatusMessage(0, true)).toBe('Loading patients...');
    expect(patientListStatusMessage(12, true)).toBe('Loading patients...');
  });

  it('announces an empty result set', () => {
    expect(patientListStatusMessage(0, false)).toBe('No patients found');
  });

  it('announces the result count after a search or filter change', () => {
    expect(patientListStatusMessage(1, false)).toBe('1 record(s) found');
    expect(patientListStatusMessage(42, false)).toBe('42 record(s) found');
  });
});
