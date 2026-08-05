import {
  requiresPrescriptionOverride,
  screenPrescription,
  type CdsAlert,
} from '../src/services/interactionService';

describe('interactionService', () => {
  it('screens drug-drug interactions across severity tiers', () => {
    expect(screenPrescription({ medication: 'Losartan', activeMedications: ['Lisinopril'] })[0].severity).toBe('MAJOR');
    expect(screenPrescription({ medication: 'Levothyroxine', activeMedications: ['Omeprazole'] })[0].severity).toBe('MODERATE');
    expect(screenPrescription({ medication: 'Amlodipine', activeMedications: ['Metoprolol'] }).some(alert => alert.severity === 'MINOR')).toBe(true);
    expect(screenPrescription({ medication: 'Amoxicillin', activeMedications: [] })).toEqual([]);
  });

  it('screens allergy and cross-sensitivity alerts', () => {
    const penicillinAlert = screenPrescription({ medication: 'Amoxicillin', allergies: ['Penicillin'] });
    const sulfaAlert = screenPrescription({ medication: 'Hydrochlorothiazide', allergies: ['Sulfa'] });
    expect(penicillinAlert[0].category).toBe('DRUG_ALLERGY');
    expect(penicillinAlert[0].severity).toBe('CONTRAINDICATED');
    expect(sulfaAlert[0].severity).toBe('MAJOR');
  });

  it('detects exact and class duplicate therapy', () => {
    expect(screenPrescription({ medication: 'Lisinopril', activeMedications: ['lisinopril'] })[0]).toMatchObject({
      category: 'DUPLICATE_THERAPY',
      severity: 'MAJOR',
    });
    expect(screenPrescription({
      medication: 'Lisinopril',
      activeMedications: [{ name: 'Enalapril', class: 'ACE Inhibitor' }],
    })[0].severity).toBe('MODERATE');
  });

  it('returns a clean screen, orders alerts, and matches case-insensitively', () => {
    expect(screenPrescription({ medication: 'Gabapentin', activeMedications: ['Metformin'] })).toEqual([]);
    const alerts: CdsAlert[] = screenPrescription({
      medication: 'amoxicillin',
      activeMedications: ['Lisinopril'],
      allergies: ['penicillin'],
    });
    expect(alerts[0].severity).toBe('CONTRAINDICATED');
    expect(screenPrescription({ medication: 'LOSARTAN', activeMedications: ['lIsInOpRiL'] })[0].severity).toBe('MAJOR');
  });

  it('identifies when an override is required', () => {
    expect(requiresPrescriptionOverride(screenPrescription({ medication: 'Amoxicillin', allergies: ['Penicillin'] }))).toBe(true);
    expect(requiresPrescriptionOverride(screenPrescription({ medication: 'Levothyroxine', activeMedications: ['Omeprazole'] }))).toBe(false);
  });
});
