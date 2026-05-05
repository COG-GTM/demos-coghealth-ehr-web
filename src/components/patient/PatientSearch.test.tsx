import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import PatientSearch from './PatientSearch';

const mockOnSelect = jest.fn();

function renderComponent() {
  return render(<PatientSearch onSelectPatient={mockOnSelect} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PatientSearch', () => {
  it('renders search input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/Search by name, MRN/)).toBeInTheDocument();
  });

  it('typing and searching filters the default patient list by lastName', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'Smith' } });
    const searchBtn = screen.getByRole('button', { name: /Search/ });
    fireEvent.click(searchBtn);

    jest.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText('Smith, John')).toBeInTheDocument();
    });
  });

  it('typing and searching filters by MRN', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'MRN001235' } });
    const searchBtn = screen.getByRole('button', { name: /Search/ });
    fireEvent.click(searchBtn);

    jest.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText('Johnson, Sarah')).toBeInTheDocument();
      expect(screen.queryByText('Smith, John')).not.toBeInTheDocument();
    });
  });

  it('selecting a patient calls onSelectPatient callback', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'Smith' } });
    const searchBtn = screen.getByRole('button', { name: /Search/ });
    fireEvent.click(searchBtn);

    jest.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText('Smith, John')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Smith, John'));
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'John', lastName: 'Smith' })
    );
  });
});
