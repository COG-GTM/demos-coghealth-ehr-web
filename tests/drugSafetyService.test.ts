import {
  checkPrescriptionSafety,
  findDrugProfile,
  highestSeverity,
  requiresOverride,
} from '../src/services/drugSafetyService';

describe('drugSafetyService', () => {
  it('resolves brand names, salts and formulations to a generic profile', () => {
    expect(findDrugProfile('Metformin HCl ER')?.generic).toBe('Metformin');
    expect(findDrugProfile('Metoprolol Succinate')?.generic).toBe('Metoprolol');
    expect(findDrugProfile('Zoloft')?.generic).toBe('Sertraline');
    expect(findDrugProfile('Unknownazole')).toBeUndefined();
  });

  it('flags a penicillin allergy as contraindicated for amoxicillin', () => {
    const alerts = checkPrescriptionSafety('Amoxicillin', [], ['Penicillin']);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'allergy', severity: 'contraindicated' });
    expect(requiresOverride(alerts)).toBe(true);
  });

  it('treats sulfa cross-reactivity with thiazides as minor', () => {
    const alerts = checkPrescriptionSafety('Hydrochlorothiazide', [], ['Sulfa']);
    expect(alerts.map(a => a.severity)).toEqual(['minor']);
    expect(requiresOverride(alerts)).toBe(false);
  });

  it('detects dual RAAS blockade between an ACE inhibitor and an ARB', () => {
    const alerts = checkPrescriptionSafety('Losartan', ['Lisinopril'], []);
    expect(alerts).toEqual([
      expect.objectContaining({ type: 'duplicate-therapy', severity: 'major', title: 'Dual RAAS blockade' }),
    ]);
  });

  it('detects drug-drug interactions in either direction', () => {
    const forward = checkPrescriptionSafety('Prednisone', ['Metformin HCl ER'], []);
    const reverse = checkPrescriptionSafety('Metformin', ['Prednisone'], []);
    expect(forward[0]).toMatchObject({ type: 'interaction', severity: 'moderate' });
    expect(reverse[0]).toMatchObject({ type: 'interaction', severity: 'moderate' });
  });

  it('flags re-ordering an active medication as a duplicate', () => {
    const alerts = checkPrescriptionSafety('Metformin', ['Metformin HCl ER 500mg'], []);
    expect(alerts).toEqual([expect.objectContaining({ type: 'duplicate-therapy', severity: 'moderate' })]);
  });

  it('sorts alerts by severity and reports the highest', () => {
    const alerts = checkPrescriptionSafety('Sulfamethoxazole-Trimethoprim', ['Warfarin', 'Lisinopril'], ['Sulfa']);
    expect(alerts.map(a => a.severity)).toEqual(['contraindicated', 'major', 'moderate']);
    expect(highestSeverity(alerts)).toBe('contraindicated');
  });

  it('returns no alerts for a safe combination', () => {
    expect(checkPrescriptionSafety('Atorvastatin', ['Metformin', 'Lisinopril'], ['Penicillin'])).toEqual([]);
    expect(highestSeverity([])).toBeNull();
  });
});
