import { checkPrescriptionSafety } from '../src/services/interactionService';

describe('checkPrescriptionSafety', () => {
  const baseInput = { currentMedications: [] as string[], allergies: [] as string[] };

  test('returns no alerts when there are no conflicts', () => {
    const result = checkPrescriptionSafety({ ...baseInput, medication: 'Atorvastatin', currentMedications: ['Metformin HCl ER 500mg'] });
    expect(result.alerts).toHaveLength(0);
    expect(result.highestSeverity).toBeNull();
    expect(result.requiresOverride).toBe(false);
  });

  test('flags penicillin cross-sensitivity for amoxicillin as contraindicated', () => {
    const result = checkPrescriptionSafety({ ...baseInput, medication: 'Amoxicillin', allergies: ['Penicillin'] });
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ kind: 'allergy', severity: 'contraindicated', interactsWith: 'Penicillin' });
    expect(result.requiresOverride).toBe(true);
  });

  test('allergy matching is case-insensitive and tolerant of extra words', () => {
    const result = checkPrescriptionSafety({ ...baseInput, medication: 'Hydrochlorothiazide', allergies: ['Sulfa Drugs'] });
    expect(result.alerts[0]).toMatchObject({ kind: 'allergy', severity: 'major' });
  });

  test('detects duplicate therapy regardless of salt/formulation suffixes and dose', () => {
    const result = checkPrescriptionSafety({ ...baseInput, medication: 'Metformin', currentMedications: ['Metformin HCl ER 500mg'] });
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ kind: 'duplicate', severity: 'major' });
    expect(result.requiresOverride).toBe(true);
  });

  test('detects drug-drug interactions in either direction', () => {
    const forward = checkPrescriptionSafety({ ...baseInput, medication: 'Losartan', currentMedications: ['Lisinopril 10mg'] });
    const reverse = checkPrescriptionSafety({ ...baseInput, medication: 'Lisinopril', currentMedications: ['Losartan 50mg'] });
    expect(forward.alerts[0]).toMatchObject({ kind: 'interaction', severity: 'major', title: 'Dual RAAS blockade' });
    expect(reverse.alerts[0]).toMatchObject({ kind: 'interaction', severity: 'major', title: 'Dual RAAS blockade' });
  });

  test('moderate and minor alerts do not require an override', () => {
    const moderate = checkPrescriptionSafety({ ...baseInput, medication: 'Prednisone', currentMedications: ['Metformin HCl ER 500mg'] });
    expect(moderate.highestSeverity).toBe('moderate');
    expect(moderate.requiresOverride).toBe(false);

    const minor = checkPrescriptionSafety({ ...baseInput, medication: 'Hydrochlorothiazide', currentMedications: ['Lisinopril 10mg'] });
    expect(minor.highestSeverity).toBe('minor');
    expect(minor.requiresOverride).toBe(false);
  });

  test('sorts alerts by severity with the most severe first', () => {
    const result = checkPrescriptionSafety({
      medication: 'Furosemide',
      currentMedications: ['Lisinopril 10mg', 'Prednisone 10mg', 'Metformin HCl ER 500mg'],
      allergies: ['Sulfa'],
    });
    const severities = result.alerts.map(a => a.severity);
    expect(severities).toEqual(['major', 'moderate', 'moderate', 'minor']);
    expect(result.alerts[0].kind).toBe('allergy');
    expect(result.highestSeverity).toBe('major');
  });

  test('does not report the same duplicate twice when multiple matching orders exist', () => {
    const result = checkPrescriptionSafety({
      ...baseInput,
      medication: 'Metoprolol Succinate',
      currentMedications: ['Metoprolol Succinate 25mg', 'Metoprolol Succinate ER 50mg'],
    });
    expect(result.alerts.filter(a => a.kind === 'duplicate')).toHaveLength(1);
  });
});
