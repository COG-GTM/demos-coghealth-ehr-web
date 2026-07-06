import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PatientBanner from '../../src/components/patient/PatientBanner';
import type { Patient } from '../../src/types';

const basePatient: Patient = {
  id: 1,
  mrn: 'MRN001234',
  firstName: 'John',
  middleName: 'Quincy',
  lastName: 'Smith',
  dateOfBirth: '1980-06-15',
  gender: 'MALE',
  phoneMobile: '(555) 123-4567',
  email: 'john.smith@email.com',
  active: true,
};

describe('PatientBanner', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders the patient name with middle initial and MRN', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
    expect(screen.getByText(/Q\./)).toBeInTheDocument();
    expect(screen.getByText('MRN001234')).toBeInTheDocument();
  });

  it('computes and shows the patient age', () => {
    render(<PatientBanner patient={basePatient} />);
    // Born 1980-06-15, "today" is 2024-01-01 -> 43 years old.
    expect(screen.getByText(/43y M/)).toBeInTheDocument();
  });

  it('renders contact details when present', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    expect(screen.getByText('john.smith@email.com')).toBeInTheDocument();
  });

  it('shows a DECEASED flag for deceased patients', () => {
    render(<PatientBanner patient={{ ...basePatient, deceased: true }} />);
    expect(screen.getByText('DECEASED')).toBeInTheDocument();
  });

  it('shows an INACTIVE flag for inactive (non-deceased) patients', () => {
    render(<PatientBanner patient={{ ...basePatient, active: false }} />);
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('lists allergens when allergies are provided', () => {
    render(
      <PatientBanner
        patient={basePatient}
        allergies={[
          { allergen: 'Penicillin', severity: 'Severe' },
          { allergen: 'Peanuts', severity: 'Moderate' },
        ]}
      />
    );
    expect(screen.getByText(/ALLERGIES: Penicillin, Peanuts/)).toBeInTheDocument();
  });
});
