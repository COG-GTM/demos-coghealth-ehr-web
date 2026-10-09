import { ALERT_LEGEND, getMedicationAlerts } from '../src/components/medications/medicationAlerts';

const empty = { interactions: [], allergies: [] };

describe('getMedicationAlerts', () => {
  it('returns no alerts for an order without CDS flags', () => {
    expect(getMedicationAlerts(empty)).toEqual([]);
  });

  it('labels every alert kind with text, not just an icon colour', () => {
    const alerts = getMedicationAlerts({
      interactions: [
        { drug: 'Warfarin', severity: 'high' },
        { drug: 'Aspirin', severity: 'moderate' },
      ],
      allergies: ['Penicillin - ALLERGY OVERRIDE'],
      renalDoseAlert: 'eGFR 28 - reduce dose',
      geriatricAlert: 'Age 71 - Use caution with opioids in elderly',
    });

    expect(alerts.map(a => [a.kind, a.abbreviation, a.label])).toEqual([
      ['interaction', 'I', 'Drug interaction'],
      ['allergy', 'A', 'Allergy alert'],
      ['renal', 'R', 'Renal dosing'],
      ['geriatric', 'G', 'Geriatric alert'],
    ]);
    expect(alerts.map(a => a.description)).toEqual([
      'Drug interaction: Warfarin (high); Aspirin (moderate)',
      'Allergy alert: Penicillin - ALLERGY OVERRIDE',
      'Renal dosing: eGFR 28 - reduce dose',
      'Geriatric alert: Age 71 - Use caution with opioids in elderly',
    ]);
  });

  it('reports renal and geriatric alerts on their own', () => {
    expect(getMedicationAlerts({ ...empty, renalDoseAlert: 'Verify renal function' }).map(a => a.kind)).toEqual(['renal']);
    expect(getMedicationAlerts({ ...empty, geriatricAlert: 'Age 80' }).map(a => a.kind)).toEqual(['geriatric']);
  });

  it('exposes a legend for the visible abbreviations', () => {
    expect(ALERT_LEGEND).toBe('I = Drug interaction, A = Allergy alert, R = Renal dosing, G = Geriatric alert');
  });
});
