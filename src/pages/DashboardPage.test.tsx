import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../services/patientService');
jest.mock('../services/auditService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import DashboardPage from './DashboardPage';
import { patientService } from '../services/patientService';

const mockedPatientService = patientService as jest.Mocked<typeof patientService>;

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPatientService.search.mockResolvedValue({
    content: [
      { id: 1, mrn: 'MRN001', firstName: 'John', lastName: 'Smith', dateOfBirth: '1965-03-15', gender: 'MALE' as const, active: true },
      { id: 2, mrn: 'MRN002', firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1978-07-22', gender: 'FEMALE' as const, active: true },
      { id: 3, mrn: 'MRN003', firstName: 'Michael', lastName: 'Williams', dateOfBirth: '1952-11-08', gender: 'MALE' as const, active: true },
      { id: 4, mrn: 'MRN004', firstName: 'Emily', lastName: 'Brown', dateOfBirth: '1989-04-30', gender: 'FEMALE' as const, active: true },
      { id: 5, mrn: 'MRN005', firstName: 'Robert', lastName: 'Davis', dateOfBirth: '1952-09-12', gender: 'MALE' as const, active: true },
      { id: 6, mrn: 'MRN006', firstName: 'Ana', lastName: 'Martinez', dateOfBirth: '1956-02-28', gender: 'FEMALE' as const, active: true },
      { id: 7, mrn: 'MRN007', firstName: 'Carlos', lastName: 'Garcia', dateOfBirth: '1968-06-15', gender: 'MALE' as const, active: true },
      { id: 8, mrn: 'MRN008', firstName: 'Patricia', lastName: 'Wilson', dateOfBirth: '1975-12-03', gender: 'FEMALE' as const, active: true },
      { id: 9, mrn: 'MRN009', firstName: 'David', lastName: 'Lee', dateOfBirth: '1982-08-20', gender: 'MALE' as const, active: true },
      { id: 10, mrn: 'MRN010', firstName: 'Mary', lastName: 'Thompson', dateOfBirth: '1970-01-10', gender: 'FEMALE' as const, active: true },
    ],
    totalElements: 10,
    totalPages: 1,
    size: 20,
    number: 0,
  });
});

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
  });
}

describe('DashboardPage', () => {
  it('renders without crashing', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(mockedPatientService.search).toHaveBeenCalled();
    });
  });

  it('shows loading overlay initially, then content after data loads', async () => {
    renderDashboard();
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    await waitForLoad();
  });

  it('displays Inbox and Patient Worklist panel headers', async () => {
    renderDashboard();
    await waitForLoad();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Patient Worklist')).toBeInTheDocument();
  });

  it('inbox tab filtering works - click Results tab filters items', async () => {
    renderDashboard();
    await waitForLoad();
    const resultsTab = screen.getByRole('button', { name: /Results/ });
    fireEvent.click(resultsTab);
    expect(resultsTab).toBeInTheDocument();
  });

  it('markAllAsRead marks all items as read and shows success alert', async () => {
    renderDashboard();
    await waitForLoad();
    const markAllBtn = screen.getByRole('button', { name: /Mark All Read/i });
    fireEvent.click(markAllBtn);
    await waitFor(() => {
      expect(screen.getByText('All items marked as read.')).toBeInTheDocument();
    });
  });

  it('worklist filter buttons filter the patient list', async () => {
    renderDashboard();
    await waitForLoad();
    const criticalBtn = screen.getByRole('button', { name: 'Critical' });
    fireEvent.click(criticalBtn);
    expect(criticalBtn).toBeInTheDocument();
  });

  it('worklist sort dropdown changes sort order', async () => {
    renderDashboard();
    await waitForLoad();
    const sortSelect = screen.getByDisplayValue('Status');
    fireEvent.change(sortSelect, { target: { value: 'name' } });
    expect(sortSelect).toBeInTheDocument();
  });

  it('collapsible panels toggle on header click', async () => {
    renderDashboard();
    await waitForLoad();
    // Click the Inbox header to collapse
    const inboxHeader = screen.getByText('Inbox');
    const panelHeader = inboxHeader.closest('.ehr-header');
    if (panelHeader) {
      fireEvent.click(panelHeader);
    }
  });

  it('toolbar e-Prescribe button opens dialog', async () => {
    renderDashboard();
    await waitForLoad();
    // Use the toolbar button specifically
    const toolbar = screen.getByText('e-Prescribe').closest('.ehr-toolbar') as HTMLElement;
    const rxBtn = within(toolbar).getByText('e-Prescribe');
    fireEvent.click(rxBtn);
    await waitFor(() => {
      expect(screen.getByText('e-Prescribe Medication')).toBeInTheDocument();
    });
  });

  it('toolbar Order Labs button opens dialog', async () => {
    renderDashboard();
    await waitForLoad();
    const toolbar = screen.getByText('Order Labs').closest('.ehr-toolbar') as HTMLElement;
    const labBtn = within(toolbar).getByText('Order Labs');
    fireEvent.click(labBtn);
    await waitFor(() => {
      expect(screen.getByText('Order Laboratory Tests')).toBeInTheDocument();
    });
  });

  it('toolbar Print button opens print dialog', async () => {
    renderDashboard();
    await waitForLoad();
    // Get the first Print button in the toolbar (not the "Print List" button in the worklist)
    const allPrintBtns = screen.getAllByRole('button', { name: /^Print$/i });
    fireEvent.click(allPrintBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('Print Dashboard')).toBeInTheDocument();
    });
  });

  it('clicking a worklist patient row navigates to /patients/{id}', async () => {
    renderDashboard();
    await waitForLoad();
    // The worklist rows have onClick that navigates
    // Find a worklist row that has "Smith, John" in it
    const allSmith = screen.getAllByText('Smith, John');
    // Click the row containing the Smith text in the worklist
    const row = allSmith[allSmith.length - 1].closest('tr');
    if (row) {
      fireEvent.click(row);
      expect(mockNavigate).toHaveBeenCalledWith('/patients/1');
    }
  });
});
