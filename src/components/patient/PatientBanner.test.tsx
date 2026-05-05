import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import PatientBanner from './PatientBanner';
import type { Patient } from '../../types';

const testPatient: Patient = {
  id: 1,
  mrn: 'MRN001234',
  firstName: 'John',
  lastName: 'Smith',
  dateOfBirth: '1965-03-15',
  gender: 'MALE',
  phoneMobile: '(555) 123-4567',
  email: 'john.smith@email.com',
  active: true,
};

describe('PatientBanner', () => {
  it('renders patient name, MRN, DOB, gender, age', () => {
    render(<PatientBanner patient={testPatient} />);
    expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
    expect(screen.getByText('MRN001234')).toBeInTheDocument();
    expect(screen.getByText(/03\/15\/1965/)).toBeInTheDocument();
    expect(screen.getByText(/M\)/)).toBeInTheDocument();
  });

  it('displays allergy information when allergies are provided', () => {
    const allergies = [
      { allergen: 'Penicillin', severity: 'Moderate' },
      { allergen: 'Sulfa', severity: 'Severe' },
    ];
    render(<PatientBanner patient={testPatient} allergies={allergies} />);
    expect(screen.getByText(/ALLERGIES:/)).toBeInTheDocument();
    expect(screen.getByText(/Penicillin, Sulfa/)).toBeInTheDocument();
  });

  it('does not display allergy section when no allergies', () => {
    render(<PatientBanner patient={testPatient} allergies={[]} />);
    expect(screen.queryByText(/ALLERGIES:/)).not.toBeInTheDocument();
  });
});
