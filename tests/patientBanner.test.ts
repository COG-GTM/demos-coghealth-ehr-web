import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PatientBanner from '../src/components/patient/PatientBanner';
import { isSevereAllergy, summarizeAllergies } from '../src/components/patient/allergySummary';
import type { Patient } from '../src/types';

const patient = {
  id: 1,
  mrn: 'MRN000123',
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1980-05-01',
  gender: 'FEMALE',
  active: true,
  deceased: false,
} as unknown as Patient;

const render = (allergies: { allergen: string; severity: string }[]) =>
  renderToStaticMarkup(createElement(PatientBanner, { patient, allergies }));

const allergyBadge = (html: string) => {
  const match = html.match(/<div[^>]*data-testid="patient-banner-allergies"[\s\S]*?<\/span><\/div>/);
  return match ? match[0] : '';
};

const visibleText = (html: string) => html.replace(/<[^>]+>/g, '');

describe('summarizeAllergies', () => {
  it('treats severity case-insensitively', () => {
    expect(isSevereAllergy('Severe')).toBe(true);
    expect(isSevereAllergy('SEVERE ')).toBe(true);
    expect(isSevereAllergy('Moderate')).toBe(false);
    expect(isSevereAllergy(undefined)).toBe(false);
  });

  it('labels severe allergens and lists them first', () => {
    const summary = summarizeAllergies([
      { allergen: 'Latex', severity: 'Mild' },
      { allergen: 'Penicillin', severity: 'Severe' },
    ]);
    expect(summary.hasSevere).toBe(true);
    expect(summary.heading).toBe('SEVERE ALLERGIES:');
    expect(summary.items.map(i => i.label)).toEqual(['Penicillin (SEVERE)', 'Latex']);
  });
});

describe('PatientBanner allergy badge', () => {
  it('announces a severe allergy in text, not only by colour', () => {
    const badge = allergyBadge(render([
      { allergen: 'Latex', severity: 'Moderate' },
      { allergen: 'Penicillin', severity: 'Severe' },
    ]));
    expect(badge).toContain('role="alert"');
    expect(badge).toContain('data-severity="severe"');
    expect(visibleText(badge)).toBe('Warning: SEVERE ALLERGIES: Penicillin (SEVERE), Latex');
  });

  it('keeps the standard badge for non-severe allergies', () => {
    const badge = allergyBadge(render([{ allergen: 'Penicillin', severity: 'Moderate' }]));
    expect(badge).not.toContain('role="alert"');
    expect(badge).toContain('data-severity="standard"');
    expect(visibleText(badge)).toBe('ALLERGIES: Penicillin');
  });

  it('renders no allergy badge when there are no allergies', () => {
    expect(allergyBadge(render([]))).toBe('');
  });

  it('gives the allergies button an accessible name', () => {
    expect(render([])).toContain('aria-label="View Allergies"');
  });
});
