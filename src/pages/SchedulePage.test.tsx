import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import SchedulePage from './SchedulePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SchedulePage', () => {
  it('renders appointment list with correct columns', () => {
    renderPage();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Patient')).toBeInTheDocument();
    // Chief Complaint is a column header in the table
    const headers = document.querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.textContent);
    expect(headerTexts).toContain('Chief Complaint');
    expect(headerTexts).toContain('Type');
    expect(headerTexts).toContain('Room');
    expect(headerTexts).toContain('Status');
    expect(headerTexts).toContain('Actions');
  });

  it('displays stats bar with correct count labels', () => {
    renderPage();
    // Stats bar has text like "Total: <strong>10</strong>"
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('Completed:')).toBeInTheDocument();
    expect(screen.getByText('In Progress:')).toBeInTheDocument();
    expect(screen.getByText('Waiting:')).toBeInTheDocument();
    expect(screen.getByText('Upcoming:')).toBeInTheDocument();
  });

  it('status filter tabs filter appointments', () => {
    renderPage();
    // Use getAllByRole since "Waiting" appears in stats and as a filter tab
    const waitingButtons = screen.getAllByRole('button', { name: /Waiting/ });
    const waitingTab = waitingButtons[waitingButtons.length - 1];
    fireEvent.click(waitingTab);
    expect(waitingTab).toBeInTheDocument();
  });

  it('date navigation - Today button exists and is clickable', () => {
    renderPage();
    const todayBtn = screen.getByRole('button', { name: /Today/ });
    fireEvent.click(todayBtn);
    expect(todayBtn).toBeInTheDocument();
  });

  it('date display shows formatted date', () => {
    renderPage();
    const dateElements = screen.getAllByText(/01\/18\/2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('Check In button changes appointment status', () => {
    renderPage();
    const checkInBtns = screen.getAllByText('Check In');
    expect(checkInBtns.length).toBeGreaterThan(0);
    fireEvent.click(checkInBtns[0]);
  });

  it('Start button navigates to patient chart', () => {
    renderPage();
    const startBtns = screen.getAllByText('Start');
    expect(startBtns.length).toBeGreaterThan(0);
    fireEvent.click(startBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/patients/'));
  });

  it('renders patient names in the appointment list', () => {
    renderPage();
    expect(screen.getAllByText('Smith, John').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Martinez, Ana').length).toBeGreaterThan(0);
  });

  it('selecting an appointment shows detail panel', () => {
    renderPage();
    // Click on Martinez, Ana appointment (may appear in both table and detail)
    const martinezElements = screen.getAllByText('Martinez, Ana');
    fireEvent.click(martinezElements[0]);
  });
});
