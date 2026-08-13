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

  it('targets the most recent patient chart for the New Order action', () => {
    const sections = buildCommandPaletteSections('new order', [], [defaultPatientSearch[3]]);
    const action = sections.find((section) => section.section === 'Actions')?.items[0];

    expect(action?.target).toBe(`/patients/${defaultPatientSearch[3].id}`);
    expect(action?.detail).toContain(defaultPatientSearch[3].name);
  });

  it('falls back to patient selection for the New Order action without recents', () => {
    const sections = buildCommandPaletteSections('new order', [], []);
    const action = sections.find((section) => section.section === 'Actions')?.items[0];

    expect(action?.target).toBe('/patients');
    expect(action?.detail).toContain('Select a patient');
  });
});
