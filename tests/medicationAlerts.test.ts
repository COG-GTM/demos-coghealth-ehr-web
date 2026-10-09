import {
  describeMedicationAlerts,
  hasMedicationAlerts,
  listMedicationAlerts,
} from '../src/utils/medicationAlerts';

const noAlerts = { interactions: [], allergies: [] };

describe('medication CDS alert summary', () => {
  it('reports no alerts for a clean order', () => {
    expect(hasMedicationAlerts(noAlerts)).toBe(false);
    expect(describeMedicationAlerts(noAlerts)).toBe('No clinical alerts.');
  });

  it('lists every alert category in panel order', () => {
    const order = {
      interactions: [{ drug: 'Sertraline', severity: 'high' as const, description: 'Serotonin syndrome' }],
      allergies: ['Penicillin'],
      renalDoseAlert: 'eGFR 30',
      geriatricAlert: 'Age 71',
      duplicateTherapy: 'Verify override',
    };
    expect(listMedicationAlerts(order)).toEqual([
      'High drug interaction with Sertraline: Serotonin syndrome',
      'Allergy alert: Penicillin',
      'Renal dosing: eGFR 30',
      'Geriatric alert: Age 71',
      'Override: Verify override',
    ]);
    expect(describeMedicationAlerts(order)).toMatch(/^5 clinical alerts: High drug interaction/);
  });

  it('counts renal-only and override-only orders as alerting', () => {
    expect(hasMedicationAlerts({ ...noAlerts, renalDoseAlert: 'Check eGFR' })).toBe(true);
    expect(describeMedicationAlerts({ ...noAlerts, duplicateTherapy: 'Allergy override' })).toBe(
      '1 clinical alert: Override: Allergy override.'
    );
  });
});
