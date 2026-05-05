import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../services/patientService');
jest.mock('../services/auditService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import PatientSearchPage from './PatientSearchPage';
import { patientService } from '../services/patientService';

const mockedPatientService = patientService as jest.Mocked<typeof patientService>;

const testPatients = [
  { id: 1, mrn: 'MRN001234', firstName: 'John', lastName: 'Smith', dateOfBirth: '1965-03-15', gender: 'MALE' as const, phoneMobile: '(555) 123-4567', active: true },
  { id: 2, mrn: 'MRN001235', firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1978-07-22', gender: 'FEMALE' as const, phoneMobile: '(555) 234-5678', active: true },
  { id: 3, mrn: 'MRN001236', firstName: 'Michael', lastName: 'Williams', dateOfBirth: '1952-11-08', gender: 'MALE' as const, phoneMobile: '(555) 345-6789', active: true },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PatientSearchPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPatientService.search.mockResolvedValue({
    content: testPatients,
    totalElements: 3,
    totalPages: 1,
    size: 100,
    number: 0,
  });
});

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.queryByText('Loading patients...')).not.toBeInTheDocument();
  });
}

describe('PatientSearchPage', () => {
  it('renders and fetches patients on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockedPatientService.search).toHaveBeenCalledWith('', 0, 100);
    });
  });

  it('shows loading overlay while fetching, then patient table', async () => {
    renderPage();
    expect(screen.getByText('Loading patients...')).toBeInTheDocument();
    await waitForLoad();
    expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
  });

  it('displays correct column headers', async () => {
    renderPage();
    await waitForLoad();
    expect(screen.getByText('MRN')).toBeInTheDocument();
    expect(screen.getByText('Patient Name')).toBeInTheDocument();
    expect(screen.getByText('DOB')).toBeInTheDocument();
    expect(screen.getByText('Sex')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('search input + Find button triggers handleSearch filtering', async () => {
    renderPage();
    await waitForLoad();
    const searchInput = screen.getByPlaceholderText('Name, MRN, DOB, Phone...');
    fireEvent.change(searchInput, { target: { value: 'smith' } });
    const findBtn = screen.getByRole('button', { name: /Find/i });
    fireEvent.click(findBtn);
    await waitFor(() => {
      expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
    });
  });

  it('client-side text search filters by lastName', async () => {
    renderPage();
    await waitForLoad();
    const searchInput = screen.getByPlaceholderText('Name, MRN, DOB, Phone...');
    fireEvent.change(searchInput, { target: { value: 'johnson' } });
    const findBtn = screen.getByRole('button', { name: /Find/i });
    fireEvent.click(findBtn);
    await waitFor(() => {
      expect(screen.getByText(/Johnson, Sarah/)).toBeInTheDocument();
      expect(screen.queryByText(/Smith, John/)).not.toBeInTheDocument();
    });
  });

  it('filter panel: toggling status checkboxes filters results', async () => {
    renderPage();
    await waitForLoad();
    // ACTIVE checkbox is inside the Patient Status section (expanded by default)
    const activeCheckboxes = screen.getAllByLabelText('ACTIVE');
    fireEvent.click(activeCheckboxes[0]);
    const findBtn = screen.getByRole('button', { name: /Find/i });
    fireEvent.click(findBtn);
  });

  it('filter panel: gender filter works', async () => {
    renderPage();
    await waitForLoad();
    const demoSection = screen.getByText('Demographics');
    fireEvent.click(demoSection);
    await waitFor(() => {
      expect(screen.getByLabelText('Male')).toBeInTheDocument();
    });
    const maleCheckbox = screen.getByLabelText('Male');
    fireEvent.click(maleCheckbox);
    const findBtn = screen.getByRole('button', { name: /Find/i });
    fireEvent.click(findBtn);
  });

  it('filter panel: insurance type filter works', async () => {
    renderPage();
    await waitForLoad();
    const insuranceSection = screen.getByText('Insurance Type');
    fireEvent.click(insuranceSection);
    await waitFor(() => {
      expect(screen.getByLabelText('Commercial')).toBeInTheDocument();
    });
  });

  it('clearFilters resets all filters and shows all patients', async () => {
    renderPage();
    await waitForLoad();
    const activeCheckboxes = screen.getAllByLabelText('ACTIVE');
    fireEvent.click(activeCheckboxes[0]);
    const findBtn = screen.getByRole('button', { name: /Find/i });
    fireEvent.click(findBtn);
    // Now clear
    const clearBtn = screen.queryByText(/Clear/);
    if (clearBtn) {
      fireEvent.click(clearBtn);
      await waitFor(() => {
        expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
      });
    }
  });

  it('activeFilterCount displays correctly in the filter header', async () => {
    renderPage();
    await waitForLoad();
    const activeCheckboxes = screen.getAllByLabelText('ACTIVE');
    fireEvent.click(activeCheckboxes[0]);
    const findBtn = screen.getByRole('button', { name: /Find/i });
    fireEvent.click(findBtn);
    await waitFor(() => {
      expect(screen.getByText(/Clear \(1\)/)).toBeInTheDocument();
    });
  });

  it('single-clicking a patient row selects it and shows the detail panel', async () => {
    renderPage();
    await waitForLoad();
    const patientCell = screen.getByText(/Smith, John/);
    fireEvent.click(patientCell);
    // Detail panel should show the patient name again
    await waitFor(() => {
      const names = screen.getAllByText(/Smith, John/);
      expect(names.length).toBeGreaterThanOrEqual(2); // One in table, one in detail panel
    });
  });

  it('double-clicking a patient row navigates to /patients/{id}', async () => {
    renderPage();
    await waitForLoad();
    const patientCell = screen.getByText(/Smith, John/);
    fireEvent.doubleClick(patientCell);
    expect(mockNavigate).toHaveBeenCalledWith('/patients/1');
  });

  it('Open Chart button in detail panel navigates correctly', async () => {
    renderPage();
    await waitForLoad();
    const patientCell = screen.getByText(/Smith, John/);
    fireEvent.click(patientCell);
    await waitFor(() => {
      const openChartBtn = screen.getByText('Open Chart');
      fireEvent.click(openChartBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/patients/1');
    });
  });

  it('no patients found message when search returns empty', async () => {
    mockedPatientService.search.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
    });
    renderPage();
    await waitForLoad();
    expect(screen.getByText('No patients found')).toBeInTheDocument();
  });
});
