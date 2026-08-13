import { defaultPatientSearch } from '../src/data/defaultPatients';
import { buildCommandPaletteSections } from '../src/utils/commandPaletteItems';

describe('buildCommandPaletteSections', () => {
  it('shows recents first without showing the full patient roster for an empty query', () => {
    const sections = buildCommandPaletteSections('', [], [defaultPatientSearch[2], defaultPatientSearch[0]]);

    expect(sections.map((section) => section.section)).toEqual(['Recent', 'Navigate', 'Actions']);
    expect(sections[0].items.map((item) => item.label)).toEqual(['Williams, Michael', 'Smith, John']);
    expect(sections.some((section) => section.section === 'Patients')).toBe(false);
  });

  it('uses the fallback patient roster for non-empty queries without a Recent section', () => {
    const sections = buildCommandPaletteSections('smith', [], [defaultPatientSearch[2]]);

    expect(sections.map((section) => section.section)).toContain('Patients');
    expect(sections.map((section) => section.section)).not.toContain('Recent');
    expect(sections.find((section) => section.section === 'Patients')?.items.map((item) => item.label))
      .toEqual(['Smith, John']);
  });

  it('targets the patient chart for the New Order action', () => {
    const sections = buildCommandPaletteSections('new order', [], []);
    const action = sections.find((section) => section.section === 'Actions')?.items[0];

    expect(action?.target).toBe('/patients/1');
    expect(action?.detail).toContain('patient chart order workflow');
  });
});
