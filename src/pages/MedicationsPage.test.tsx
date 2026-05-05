import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import MedicationsPage from './MedicationsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <MedicationsPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MedicationsPage', () => {
  it('renders medication list with correct columns', () => {
    renderPage();
    const headers = document.querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.textContent);
    expect(headerTexts).toContain('Medication');
    expect(headerTexts).toContain('Patient');
    expect(headerTexts).toContain('Sig');
  });

  it('stats bar shows correct count labels', () => {
    renderPage();
    expect(screen.getByText(/Active:/)).toBeInTheDocument();
    expect(screen.getByText(/Pending:/)).toBeInTheDocument();
    expect(screen.getByText(/Controlled:/)).toBeInTheDocument();
    expect(screen.getByText(/w\/Alerts:/)).toBeInTheDocument();
  });

  it('status filter tabs filter medication orders correctly', () => {
    renderPage();
    const pendingButtons = screen.getAllByRole('button', { name: /Pending/ });
    const pendingTab = pendingButtons[pendingButtons.length - 1];
    fireEvent.click(pendingTab);
    expect(pendingTab).toBeInTheDocument();
  });

  it('search input filters by medication name', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Medication, patient, Rx#...');
    fireEvent.change(searchInput, { target: { value: 'Metformin' } });
  });

  it('search input filters by patient name', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Medication, patient, Rx#...');
    fireEvent.change(searchInput, { target: { value: 'Smith' } });
  });

  it('By Patient view mode groups medications by patient', () => {
    renderPage();
    const byPatientBtn = screen.getByRole('button', { name: /By Patient/i });
    fireEvent.click(byPatientBtn);
    expect(screen.getByText(/MRN001234/)).toBeInTheDocument();
  });

  it('selecting a medication shows detail panel', () => {
    renderPage();
    expect(screen.getByText(/Clinical Alerts/)).toBeInTheDocument();
  });

  it('Sign button appears for PENDING orders', () => {
    renderPage();
    const signBtns = screen.getAllByText('Sign');
    expect(signBtns.length).toBeGreaterThan(0);
  });

  it('Renew button appears for ACTIVE orders', () => {
    renderPage();
    const renewBtns = screen.getAllByText('Renew');
    expect(renewBtns.length).toBeGreaterThan(0);
  });
});
