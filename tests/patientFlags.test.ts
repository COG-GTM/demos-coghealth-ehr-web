import {
  alertsLabel,
  flagConfig,
  flagLabel,
  hiddenFlagsLabel,
  openEncountersLabel,
} from '../src/pages/patientFlags';

describe('patient search grid text alternatives', () => {
  it('names every flag, including icon-only ones', () => {
    expect(flagLabel('FALL_RISK')).toBe('Fall Risk');
    expect(flagLabel('ALLERGY')).toBe('Allergy');
    expect(flagLabel('VIP')).toBe('VIP');
    expect(flagLabel('ISOLATION')).toBe('Isolation');
    for (const [key, cfg] of Object.entries(flagConfig)) {
      expect(flagLabel(key)).toBe(cfg.label);
      expect(cfg.label.trim()).not.toBe('');
    }
  });

  it('falls back to the raw code for unknown flags', () => {
    expect(flagLabel('NPO')).toBe('NPO');
  });

  it('names the flags hidden behind the +N overflow', () => {
    expect(hiddenFlagsLabel(['FALL_RISK', 'ALLERGY', 'DNR'])).toBe('');
    expect(hiddenFlagsLabel(['FALL_RISK', 'ALLERGY', 'DNR', 'ISOLATION'])).toBe('1 more flag: Isolation');
    expect(hiddenFlagsLabel(['FALL_RISK', 'ALLERGY', 'DNR', 'ISOLATION', 'VIP'])).toBe('2 more flags: Isolation, VIP');
  });

  it('exposes alert text rather than just an icon', () => {
    expect(alertsLabel([])).toBe('');
    expect(alertsLabel(['Penicillin allergy', 'Latex allergy'])).toBe('Alerts: Penicillin allergy; Latex allergy');
  });

  it('describes open encounter counts', () => {
    expect(openEncountersLabel(1)).toBe('1 open encounter');
    expect(openEncountersLabel(3)).toBe('3 open encounters');
  });
});
