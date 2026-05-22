import { render, screen } from '@testing-library/react';
import PatientBanner from './PatientBanner';
import type { Patient } from '../../types';

const basePatient: Patient = {
  id: 1,
  mrn: 'MRN001234',
  firstName: 'John',
  middleName: 'Robert',
  lastName: 'Smith',
  dateOfBirth: '1965-03-15',
  gender: 'MALE',
  phoneMobile: '(555) 123-4567',
  email: 'john.smith@email.com',
  active: true,
};

describe('PatientBanner', () => {
  it('renders patient name in Last, First format', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
  });

  it('displays middle initial when middleName is present', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText(/R\./)).toBeInTheDocument();
  });

  it('does not display middle initial when middleName is absent', () => {
    const patient = { ...basePatient, middleName: undefined };
    render(<PatientBanner patient={patient} />);
    const nameEl = screen.getByText(/Smith, John/);
    expect(nameEl.textContent).not.toContain('.');
  });

  it('displays MRN', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText('MRN001234')).toBeInTheDocument();
  });

  it('displays formatted date of birth', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText(/03\/15\/1965/)).toBeInTheDocument();
  });

  it('displays gender indicator M for MALE', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText(/M\)/)).toBeInTheDocument();
  });

  it('displays gender indicator F for FEMALE', () => {
    const patient = { ...basePatient, gender: 'FEMALE' as const };
    render(<PatientBanner patient={patient} />);
    expect(screen.getByText(/F\)/)).toBeInTheDocument();
  });

  it('displays phone number when present', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
  });

  it('does not display phone when not present', () => {
    const patient = { ...basePatient, phoneMobile: undefined };
    render(<PatientBanner patient={patient} />);
    expect(screen.queryByText('(555) 123-4567')).not.toBeInTheDocument();
  });

  it('displays email when present', () => {
    render(<PatientBanner patient={basePatient} />);
    expect(screen.getByText('john.smith@email.com')).toBeInTheDocument();
  });

  it('does not display email when not present', () => {
    const patient = { ...basePatient, email: undefined };
    render(<PatientBanner patient={patient} />);
    expect(screen.queryByText('john.smith@email.com')).not.toBeInTheDocument();
  });

  it('shows DECEASED badge when patient is deceased', () => {
    const patient = { ...basePatient, deceased: true };
    render(<PatientBanner patient={patient} />);
    expect(screen.getByText('DECEASED')).toBeInTheDocument();
  });

  it('shows INACTIVE badge when patient is not active and not deceased', () => {
    const patient = { ...basePatient, active: false, deceased: false };
    render(<PatientBanner patient={patient} />);
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('does not show INACTIVE when patient is deceased', () => {
    const patient = { ...basePatient, active: false, deceased: true };
    render(<PatientBanner patient={patient} />);
    expect(screen.queryByText('INACTIVE')).not.toBeInTheDocument();
  });

  it('displays allergies when provided', () => {
    const allergies = [
      { allergen: 'Penicillin', severity: 'Moderate' },
      { allergen: 'Aspirin', severity: 'Mild' },
    ];
    render(<PatientBanner patient={basePatient} allergies={allergies} />);
    expect(screen.getByText(/Penicillin/)).toBeInTheDocument();
    expect(screen.getByText(/Aspirin/)).toBeInTheDocument();
  });

  it('does not display allergy section when no allergies', () => {
    render(<PatientBanner patient={basePatient} allergies={[]} />);
    expect(screen.queryByText('ALLERGIES:')).not.toBeInTheDocument();
  });
});
